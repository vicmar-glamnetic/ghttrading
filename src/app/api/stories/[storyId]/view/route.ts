import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** Mark a story as seen by the current member (idempotent; your own don't count). */
export async function POST(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId } = await params

  const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true, expiresAt: true } })
  if (!story || story.expiresAt <= new Date()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (story.authorId === session.user.id) return NextResponse.json({ ok: true })

  await db.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId: session.user.id } },
    create: { storyId, viewerId: session.user.id },
    update: {},
  })
  return NextResponse.json({ ok: true })
}
