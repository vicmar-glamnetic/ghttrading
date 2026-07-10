import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'
import { extractYoutubeId, fetchVideoMeta } from '@/lib/youtube'

/** Full curriculum for the builder, in order. */
export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  const lessons = await db.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: { id: true, section: true, title: true, youtubeId: true, educator: true, summary: true, durationSec: true, order: true },
  })
  return NextResponse.json(lessons)
}

/**
 * Add a lesson from a YouTube URL. The video is re-verified here rather than
 * trusting whatever the lookup call returned to the browser — a client could
 * post any id, and a dead video would render as a broken player forever.
 */
export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const section = String(body.section ?? '').trim()
  if (!section) return NextResponse.json({ error: 'Section is required.' }, { status: 400 })

  const youtubeId = extractYoutubeId(String(body.url ?? ''))
  if (!youtubeId) return NextResponse.json({ error: "That doesn't look like a YouTube link." }, { status: 400 })

  const meta = await fetchVideoMeta(youtubeId)
  if (!meta) {
    return NextResponse.json({ error: 'YouTube says that video is unavailable.' }, { status: 422 })
  }

  const duplicate = await db.lesson.findFirst({ where: { courseId, youtubeId }, select: { id: true } })
  if (duplicate) return NextResponse.json({ error: 'That video is already in this course.' }, { status: 409 })

  const last = await db.lesson.findFirst({ where: { courseId }, orderBy: { order: 'desc' }, select: { order: true } })

  // An admin-supplied title wins; otherwise use the real one from YouTube.
  const lesson = await db.lesson.create({
    data: {
      courseId,
      section,
      title: String(body.title ?? '').trim() || meta.title,
      educator: String(body.educator ?? '').trim() || meta.educator || null,
      summary: String(body.summary ?? '').trim() || null,
      youtubeId,
      durationSec: meta.durationSec,
      order: (last?.order ?? 0) + 1,
    },
    select: { id: true, section: true, title: true, youtubeId: true, educator: true, summary: true, durationSec: true, order: true },
  })

  return NextResponse.json(lesson, { status: 201 })
}
