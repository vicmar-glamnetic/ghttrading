import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params
    if (userId === session.user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const existingFollow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
    })

    if (existingFollow) {
      await db.follow.delete({
        where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
      })
      return NextResponse.json({ following: false })
    }

    await db.follow.create({ data: { followerId: session.user.id, followingId: userId } })

    await db.notification.create({
      data: {
        type: 'follow',
        message: `${session.user.name} started following you`,
        receiverId: userId,
        senderId: session.user.id,
        link: `/profile/${session.user.id}`,
      },
    })

    return NextResponse.json({ following: true })
  } catch (error) {
    console.error('[USER_FOLLOW]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
