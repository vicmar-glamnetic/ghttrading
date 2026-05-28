import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const uid = session.user.id

    const page = await db.page.findUnique({
      where: { id: pageId },
      include: {
        owner: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { followers: true, posts: true } },
        followers: { where: { followerId: uid }, select: { followerId: true } },
      },
    })

    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ ...page, isFollowing: page.followers.length > 0 })
  } catch (error) {
    console.error('[PAGE_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const page = await db.page.findUnique({ where: { id: pageId }, select: { ownerId: true } })
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (page.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, description, category, image, coverImage } = await req.json()

    const updated = await db.page.update({
      where: { id: pageId },
      data: { name, description, category, image, coverImage },
      include: {
        owner: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { followers: true, posts: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PAGE_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const page = await db.page.findUnique({ where: { id: pageId }, select: { ownerId: true } })
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (page.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.page.delete({ where: { id: pageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PAGE_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
