import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { groupId } = await params
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 10

    const group = await db.group.findUnique({ where: { id: groupId }, select: { id: true, privacy: true } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const posts = await db.post.findMany({
      where: { groupId },
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
    console.error('[GROUP_POSTS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { groupId } = await params
    const uid = session.user.id

    // Must be a member
    const membership = await db.groupMember.findUnique({
      where: { userId_groupId: { userId: uid, groupId } },
      select: { status: true },
    })
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'You must be a member to post' }, { status: 403 })
    }

    const { content, images, feeling } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    const post = await db.post.create({
      data: {
        content,
        images: images || [],
        feeling,
        privacy: 'public',
        authorId: uid,
        groupId,
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: uid }, select: { userId: true } },
        comments: { take: 3, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true, image: true, username: true } }, _count: { select: { likes: true } }, likes: { where: { userId: uid }, select: { userId: true } } } },
      },
    })

    // Touch group updatedAt for ordering
    await db.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('[GROUP_POSTS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
