import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** Enrol the caller. Idempotent — clicking twice is not an error. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { slug } = await params
  const course = await db.course.findUnique({ where: { slug }, select: { id: true, published: true } })
  if (!course || !course.published) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  await db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: { userId, courseId: course.id },
    update: {},
  })

  return NextResponse.json({ enrolled: true })
}
