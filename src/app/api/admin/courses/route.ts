import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

/** Kebab-case a title into a URL slug. */
function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const LEVELS = ['beginner', 'intermediate', 'advanced']

/** All courses, published or not — the members' route only shows published ones. */
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courses = await db.course.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true, slug: true, title: true, description: true, level: true, published: true, order: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  })
  return NextResponse.json(courses)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const level = LEVELS.includes(body.level) ? body.level : 'beginner'

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 })
  }

  const base = slugify(title)
  if (!base) return NextResponse.json({ error: 'Title must contain letters or numbers.' }, { status: 400 })

  // Slugs are unique and live in the URL, so disambiguate rather than 500.
  let slug = base
  for (let i = 2; await db.course.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`
  }

  const last = await db.course.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })

  const course = await db.course.create({
    data: {
      slug, title, description, level,
      published: body.published !== false,
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json(course, { status: 201 })
}
