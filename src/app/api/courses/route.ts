import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** Course grid: every published course with the caller's own progress folded in. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true, slug: true, title: true, description: true, level: true, coverImage: true,
      lessons: { select: { id: true, youtubeId: true }, orderBy: { order: 'asc' } },
      enrollments: { where: { userId }, select: { id: true } },
    },
  })

  // One query for every lesson this member has finished, rather than one per
  // course — the grid is small but this keeps it O(1) round-trips.
  const completed = await db.lessonProgress.findMany({
    where: { userId, lesson: { courseId: { in: courses.map(c => c.id) } } },
    select: { lessonId: true },
  })
  const completedIds = new Set(completed.map(c => c.lessonId))

  return NextResponse.json(
    courses.map(({ lessons, enrollments, ...course }) => ({
      ...course,
      lessonCount: lessons.length,
      completedCount: lessons.filter(l => completedIds.has(l.id)).length,
      enrolled: enrollments.length > 0,
      // Fall back to the first lesson's thumbnail when no cover is set.
      previewYoutubeId: lessons[0]?.youtubeId ?? null,
    })),
  )
}
