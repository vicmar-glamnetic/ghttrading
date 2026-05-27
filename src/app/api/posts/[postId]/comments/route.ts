import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const comments = await db.comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, replies: true } },
        likes: { where: { userId: session.user.id }, select: { userId: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, image: true, username: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: session.user.id }, select: { userId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('[COMMENTS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params
    const { content, parentId } = await req.json()

    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const comment = await db.comment.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, replies: true } },
        likes: false,
        replies: false,
      },
    })

    // Notify post author
    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (post && post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          type: 'comment',
          message: `${session.user.name} commented on your post`,
          receiverId: post.authorId,
          senderId: session.user.id,
          link: `/posts/${postId}`,
        },
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('[COMMENTS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
