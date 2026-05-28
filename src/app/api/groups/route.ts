import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = session.user.id

    // Groups the user is a member of
    const myMemberships = await db.groupMember.findMany({
      where: { userId: uid, status: 'active' },
      select: { groupId: true },
    })
    const myGroupIds = myMemberships.map(m => m.groupId)

    const [myGroups, discover] = await Promise.all([
      db.group.findMany({
        where: { id: { in: myGroupIds } },
        include: {
          owner: { select: { id: true, name: true, image: true, username: true } },
          _count: { select: { members: true, posts: true } },
          members: { where: { userId: uid }, select: { role: true, status: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.group.findMany({
        where: {
          privacy: 'public',
          id: { notIn: myGroupIds },
        },
        include: {
          owner: { select: { id: true, name: true, image: true, username: true } },
          _count: { select: { members: true, posts: true } },
          members: { where: { userId: uid }, select: { role: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return NextResponse.json({ myGroups, discover })
  } catch (error) {
    console.error('[GROUPS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description, privacy, image, coverImage } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const group = await db.group.create({
      data: {
        name: name.trim(),
        description,
        privacy: privacy || 'public',
        image,
        coverImage,
        ownerId: session.user.id,
        members: {
          create: { userId: session.user.id, role: 'owner', status: 'active' },
        },
      },
      include: {
        owner: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { members: true, posts: true } },
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('[GROUPS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
