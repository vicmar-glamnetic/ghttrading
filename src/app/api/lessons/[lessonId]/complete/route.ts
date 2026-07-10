import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function lessonFor(lessonId: string) {
  return db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, course: { select: { published: true } } },
  })
}

/** Mark a lesson complete. Idempotent. */
export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { lessonId } = await params
  const lesson = await lessonFor(lessonId)
  if (!lesson || !lesson.course.published) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  // Finishing a lesson means you're taking the course, whether or not you ever
  // pressed Enrol — otherwise progress exists for a course you're not "in".
  await db.$transaction([
    db.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      create: { userId, courseId: lesson.courseId },
      update: {},
    }),
    db.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    }),
  ])

  return NextResponse.json({ completed: true })
}

/** Un-mark a lesson. Absence of a row is what "not done" means. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId } = await params
  await db.lessonProgress.deleteMany({ where: { userId: session.user.id, lessonId } })

  return NextResponse.json({ completed: false })
}
