import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** Delete a story: its author, or staff (admin/coach) for moderation. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId } = await params

  const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true } })
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const staff = session.user.role === 'admin' || session.user.role === 'coach'
  if (story.authorId !== session.user.id && !staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.story.delete({ where: { id: storyId } })
  return NextResponse.json({ ok: true })
}
