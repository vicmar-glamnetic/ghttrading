import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lessonId } = await params
  const body = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.section === 'string' && body.section.trim()) data.section = body.section.trim()
  if (typeof body.educator === 'string') data.educator = body.educator.trim() || null
  if (typeof body.summary === 'string') data.summary = body.summary.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  // youtubeId is intentionally not editable — swapping the video under an
  // existing lesson would silently invalidate everyone's completion of it.
  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data,
    select: { id: true, section: true, title: true, educator: true, summary: true },
  })
  return NextResponse.json(lesson)
}

/** Cascades to lesson_progress: members lose completion of this lesson. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lessonId } = await params
  await db.lesson.delete({ where: { id: lessonId } })
  return new NextResponse(null, { status: 204 })
}
