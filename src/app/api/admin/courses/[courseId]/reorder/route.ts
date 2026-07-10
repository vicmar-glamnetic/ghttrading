import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

/**
 * Rewrite lesson order from a full, ordered list of ids.
 *
 * The client sends the whole curriculum, not a delta, so a dropped or
 * duplicated id can't quietly corrupt the sequence — we reject anything that
 * isn't an exact permutation of the course's lessons.
 */
export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  const body = await req.json().catch(() => ({}))
  const lessonIds: unknown = body.lessonIds

  if (!Array.isArray(lessonIds) || lessonIds.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: 'lessonIds must be an array of ids.' }, { status: 400 })
  }

  const existing = await db.lesson.findMany({ where: { courseId }, select: { id: true } })
  const existingIds = new Set(existing.map(l => l.id))
  const sent = new Set(lessonIds as string[])

  if (sent.size !== lessonIds.length || sent.size !== existingIds.size || [...sent].some(id => !existingIds.has(id))) {
    return NextResponse.json({ error: 'lessonIds must list every lesson in this course exactly once.' }, { status: 400 })
  }

  await db.$transaction(
    (lessonIds as string[]).map((id, i) =>
      db.lesson.update({ where: { id }, data: { order: i + 1 } }),
    ),
  )

  return NextResponse.json({ reordered: lessonIds.length })
}
