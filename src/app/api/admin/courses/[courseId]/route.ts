import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

const LEVELS = ['beginner', 'intermediate', 'advanced']

export async function PATCH(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  const body = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === 'string' && body.description.trim()) data.description = body.description.trim()
  if (LEVELS.includes(body.level)) data.level = body.level
  if (typeof body.published === 'boolean') data.published = body.published

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const course = await db.course.update({
    where: { id: courseId },
    data,
    select: { id: true, slug: true, title: true, published: true },
  })
  return NextResponse.json(course)
}

/** Deletes the course, its lessons, and everyone's progress on them (cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId } = await params
  await db.course.delete({ where: { id: courseId } })
  return new NextResponse(null, { status: 204 })
}
