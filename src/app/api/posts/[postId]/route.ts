import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { summarizeReactions } from '@/lib/postReactions'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: session.user.id }, select: { userId: true, type: true } },
        comments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, image: true, username: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: session.user.id }, select: { userId: true } },
          },
        },
      },
    })

    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const summaries = await summarizeReactions([post.id])
    return NextResponse.json({ ...post, reactions: summaries[post.id] ?? [] })
  } catch (error) {
    console.error('[POST_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (post.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const updated = await db.post.update({
      where: { id: postId },
      data: { content },
      select: { id: true, content: true, updatedAt: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[POST_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (post.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.post.delete({ where: { id: postId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
