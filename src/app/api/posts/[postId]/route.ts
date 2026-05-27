import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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
        likes: { where: { userId: session.user.id }, select: { userId: true } },
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
    return NextResponse.json(post)
  } catch (error) {
    console.error('[POST_GET]', error)
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
