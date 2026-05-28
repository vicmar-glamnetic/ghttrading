import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { groupId } = await params

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { members: true, posts: true } },
        members: {
          where: { status: 'active' },
          include: { user: { select: { id: true, name: true, image: true, username: true } } },
          orderBy: { joinedAt: 'asc' },
          take: 50,
        },
      },
    })

    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const myMembership = group.members.find(m => m.userId === session.user.id) ?? null

    return NextResponse.json({ ...group, myMembership })
  } catch (error) {
    console.error('[GROUP_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { groupId } = await params
    const group = await db.group.findUnique({ where: { id: groupId }, select: { ownerId: true } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (group.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.group.delete({ where: { id: groupId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GROUP_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
