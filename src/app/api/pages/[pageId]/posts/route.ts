import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 10

    const page = await db.page.findUnique({ where: { id: pageId }, select: { id: true } })
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const posts = await db.post.findMany({
      where: { pageId },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        page: { select: { id: true, name: true, image: true, verified: true } },
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
    console.error('[PAGE_POSTS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const uid = session.user.id

    // Must be page owner
    const page = await db.page.findUnique({ where: { id: pageId }, select: { ownerId: true } })
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (page.ownerId !== uid) return NextResponse.json({ error: 'Only the page owner can post' }, { status: 403 })

    const { content, images, feeling } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    const post = await db.post.create({
      data: {
        content,
        images: images || [],
        feeling,
        privacy: 'public',
        authorId: uid,
        pageId,
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        page: { select: { id: true, name: true, image: true, verified: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: uid }, select: { userId: true } },
        comments: { take: 3, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true, image: true, username: true } }, _count: { select: { likes: true } }, likes: { where: { userId: uid }, select: { userId: true } } } },
      },
    })

    await db.page.update({ where: { id: pageId }, data: { updatedAt: new Date() } })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('[PAGE_POSTS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
