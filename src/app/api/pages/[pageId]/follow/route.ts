import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pageId } = await params
    const uid = session.user.id

    const page = await db.page.findUnique({ where: { id: pageId }, select: { id: true, ownerId: true } })
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = await db.pageFollow.findUnique({
      where: { followerId_pageId: { followerId: uid, pageId } },
    })

    if (existing) {
      await db.pageFollow.delete({ where: { followerId_pageId: { followerId: uid, pageId } } })
      return NextResponse.json({ following: false })
    } else {
      await db.pageFollow.create({ data: { followerId: uid, pageId } })
      return NextResponse.json({ following: true })
    }
  } catch (error) {
    console.error('[PAGE_FOLLOW]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
