import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const userId = searchParams.get('userId')   // filter by specific author
    const limit = 10

    let whereClause: Record<string, unknown>

    if (userId) {
      // Profile view — show only that user's public posts (or own posts for own profile)
      whereClause = {
        authorId: userId,
        ...(userId !== session.user.id ? { privacy: 'public' } : {}),
      }
    } else {
      // Main feed — own posts + followed + public
      const following = await db.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
      })
      const followingIds = following.map((f: { followingId: string }) => f.followingId)
      whereClause = {
        OR: [
          { authorId: session.user.id },
          { authorId: { in: followingIds } },
          { privacy: 'public' },
        ],
      }
    }

    const posts = await db.post.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: session.user.id }, select: { userId: true } },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, image: true, username: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: session.user.id }, select: { userId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let nextCursor: string | undefined
    if (posts.length > limit) {
      const next = posts.pop()
      nextCursor = next?.id
    }

    return NextResponse.json({ posts, nextCursor })
  } catch (error) {
    console.error('[POSTS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, images, feeling, location, privacy } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const post = await db.post.create({
      data: {
        content,
        images: images || [],
        feeling,
        location,
        privacy: privacy || 'public',
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: session.user.id }, select: { userId: true } },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, image: true, username: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: session.user.id }, select: { userId: true } },
          },
        },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('[POSTS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
