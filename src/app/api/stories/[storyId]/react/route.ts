import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'
import { getReaction, isReactionType } from '@/lib/reactions'

/**
 * React to someone's story. Sending the reaction you already gave removes it;
 * a different one replaces it. The author is notified the first time you react.
 */
export async function POST(req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id
  const { storyId } = await params

  const { type } = await req.json().catch(() => ({}))
  if (!isReactionType(type)) return NextResponse.json({ error: 'Unknown reaction' }, { status: 400 })

  const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true, expiresAt: true } })
  if (!story || story.expiresAt <= new Date()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (story.authorId === me) return NextResponse.json({ error: 'You can’t react to your own story' }, { status: 400 })

  const existing = await db.storyView.findUnique({ where: { storyId_viewerId: { storyId, viewerId: me } }, select: { reaction: true } })
  const next = existing?.reaction === type ? null : type

  await db.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId: me } },
    create: { storyId, viewerId: me, reaction: next, reactedAt: next ? new Date() : null },
    update: { reaction: next, reactedAt: next ? new Date() : null },
  })

  if (next && !existing?.reaction) {
    await notify({
      data: {
        type: 'story_reaction',
        message: `${session.user.name} reacted ${getReaction(next).emoji} to your story`,
        receiverId: story.authorId,
        senderId: me,
        link: '/feed',
      },
    })
  }

  return NextResponse.json({ reaction: next })
}
