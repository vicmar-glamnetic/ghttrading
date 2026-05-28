import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { groupId } = await params
    const uid = session.user.id

    const group = await db.group.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = await db.groupMember.findUnique({ where: { userId_groupId: { userId: uid, groupId } } })

    if (existing) {
      // Leave group (but owner can't leave)
      if (group.ownerId === uid) return NextResponse.json({ error: 'Owner cannot leave group' }, { status: 400 })
      await db.groupMember.delete({ where: { userId_groupId: { userId: uid, groupId } } })
      return NextResponse.json({ joined: false })
    } else {
      // Join group
      await db.groupMember.create({ data: { userId: uid, groupId, role: 'member', status: 'active' } })
      return NextResponse.json({ joined: true })
    }
  } catch (error) {
    console.error('[GROUP_JOIN]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
