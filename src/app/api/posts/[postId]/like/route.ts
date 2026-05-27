import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    const existingLike = await db.like.findUnique({
      where: { userId_postId: { userId: session.user.id, postId } },
    })

    if (existingLike) {
      await db.like.delete({ where: { id: existingLike.id } })
      return NextResponse.json({ liked: false })
    }

    await db.like.create({ data: { userId: session.user.id, postId } })

    // Create notification for post author
    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (post && post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          type: 'like',
          message: `${session.user.name} liked your post`,
          receiverId: post.authorId,
          senderId: session.user.id,
          link: `/posts/${postId}`,
        },
      })
    }

    return NextResponse.json({ liked: true })
  } catch (error) {
    console.error('[POST_LIKE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
