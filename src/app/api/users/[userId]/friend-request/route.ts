import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params
    const { action } = await req.json() // 'send' | 'accept' | 'decline' | 'cancel'

    if (action === 'send') {
      const existing = await db.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: session.user.id, receiverId: userId } },
      })
      if (existing) return NextResponse.json({ error: 'Request already sent' }, { status: 400 })

      const request = await db.friendRequest.create({
        data: { senderId: session.user.id, receiverId: userId },
      })

      await db.notification.create({
        data: {
          type: 'friend_request',
          message: `${session.user.name} sent you a friend request`,
          receiverId: userId,
          senderId: session.user.id,
          link: `/profile/${session.user.id}`,
        },
      })

      return NextResponse.json(request, { status: 201 })
    }

    if (action === 'accept') {
      const request = await db.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: userId, receiverId: session.user.id } },
      })
      if (!request) return NextResponse.json({ error: 'No request found' }, { status: 404 })

      await db.friendRequest.update({
        where: { id: request.id },
        data: { status: 'accepted' },
      })

      // Create mutual follows
      await db.follow.createMany({
        data: [
          { followerId: session.user.id, followingId: userId },
          { followerId: userId, followingId: session.user.id },
        ],
        skipDuplicates: true,
      })

      await db.notification.create({
        data: {
          type: 'friend_accept',
          message: `${session.user.name} accepted your friend request`,
          receiverId: userId,
          senderId: session.user.id,
          link: `/profile/${session.user.id}`,
        },
      })

      return NextResponse.json({ status: 'accepted' })
    }

    if (action === 'decline' || action === 'cancel') {
      await db.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: userId },
            { senderId: userId, receiverId: session.user.id },
          ],
        },
      })
      return NextResponse.json({ status: 'removed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[FRIEND_REQUEST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
