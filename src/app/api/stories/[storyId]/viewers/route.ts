import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** Who has seen one of your stories (author only). */
export async function GET(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId } = await params

  const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true } })
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (story.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const views = await db.storyView.findMany({
    where: { storyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { viewer: { select: { id: true, name: true, image: true } } },
  })
  return NextResponse.json({
    viewers: views.map(v => ({ ...v.viewer, at: v.createdAt.toISOString(), reaction: v.reaction })),
  })
}
