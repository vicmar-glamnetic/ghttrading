import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = session.user.id

    const myFollows = await db.pageFollow.findMany({
      where: { followerId: uid },
      select: { pageId: true },
    })
    const followedIds = myFollows.map(f => f.pageId)

    const [myPages, following, discover] = await Promise.all([
      // Pages I own
      db.page.findMany({
        where: { ownerId: uid },
        include: {
          _count: { select: { followers: true, posts: true } },
          followers: { where: { followerId: uid }, select: { followerId: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Pages I follow (but don't own)
      db.page.findMany({
        where: { id: { in: followedIds }, ownerId: { not: uid } },
        include: {
          owner: { select: { id: true, name: true, image: true, username: true } },
          _count: { select: { followers: true, posts: true } },
          followers: { where: { followerId: uid }, select: { followerId: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Discover — pages not owned or followed
      db.page.findMany({
        where: {
          id: { notIn: followedIds },
          ownerId: { not: uid },
        },
        include: {
          owner: { select: { id: true, name: true, image: true, username: true } },
          _count: { select: { followers: true, posts: true } },
          followers: { where: { followerId: uid }, select: { followerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return NextResponse.json({ myPages, following, discover }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('[PAGES_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description, category, image, coverImage } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const page = await db.page.create({
      data: {
        name: name.trim(),
        description,
        category: category || 'general',
        image,
        coverImage,
        ownerId: session.user.id,
      },
      include: {
        owner: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { followers: true, posts: true } },
      },
    })

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error('[PAGES_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
