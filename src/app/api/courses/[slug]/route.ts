import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** A single course with its full curriculum and the caller's completed lessons. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { slug } = await params

  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, description: true, level: true, published: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, section: true, title: true, youtubeId: true, educator: true, summary: true, order: true },
      },
      enrollments: { where: { userId }, select: { id: true } },
    },
  })

  if (!course || !course.published) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const completed = await db.lessonProgress.findMany({
    where: { userId, lesson: { courseId: course.id } },
    select: { lessonId: true },
  })

  const { enrollments, ...rest } = course
  return NextResponse.json({
    ...rest,
    enrolled: enrollments.length > 0,
    completedLessonIds: completed.map(c => c.lessonId),
  })
}
