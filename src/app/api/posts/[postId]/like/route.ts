import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isReactionType } from '@/lib/reactions'

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    // Reaction type is optional; defaults to a plain "like" for legacy callers.
    let type = 'like'
    try {
      const body = await req.json()
      if (isReactionType(body?.type)) type = body.type
    } catch {
      // no/invalid body — keep default
    }

    const existing = await db.like.findUnique({
      where: { userId_postId: { userId: session.user.id, postId } },
    })

    if (existing) {
      // Same reaction tapped again → remove it.
      if (existing.type === type) {
        await db.like.delete({ where: { id: existing.id } })
        return NextResponse.json({ reacted: false, type: null })
      }
      // Different reaction → switch it.
      await db.like.update({ where: { id: existing.id }, data: { type } })
      return NextResponse.json({ reacted: true, type })
    }

    await db.like.create({ data: { userId: session.user.id, postId, type } })

    // Notify the author only on a brand-new reaction.
    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    if (post && post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          type: 'like',
          message: `${session.user.name} reacted to your post`,
          receiverId: post.authorId,
          senderId: session.user.id,
          link: `/posts/${postId}`,
        },
      })
    }

    return NextResponse.json({ reacted: true, type })
  } catch (error) {
    console.error('[POST_LIKE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
