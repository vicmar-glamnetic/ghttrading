import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = session.user.id

    // Pending requests sent TO me
    const pendingReceived = await db.friendRequest.findMany({
      where: { receiverId: uid, status: 'pending' },
      include: { sender: { select: { id: true, name: true, image: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Pending requests I sent
    const pendingSent = await db.friendRequest.findMany({
      where: { senderId: uid, status: 'pending' },
      include: { receiver: { select: { id: true, name: true, image: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Accepted friends
    const friends = await db.friendRequest.findMany({
      where: {
        status: 'accepted',
        OR: [{ senderId: uid }, { receiverId: uid }],
      },
      include: {
        sender:   { select: { id: true, name: true, image: true, username: true } },
        receiver: { select: { id: true, name: true, image: true, username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // IDs to exclude from suggestions
    const friendIds = new Set<string>()
    friends.forEach(f => {
      friendIds.add(f.senderId)
      friendIds.add(f.receiverId)
    })
    pendingReceived.forEach(r => friendIds.add(r.senderId))
    pendingSent.forEach(r => friendIds.add(r.receiverId))
    friendIds.add(uid)

    // People you follow (to exclude)
    const following = await db.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    })
    following.forEach(f => friendIds.add(f.followingId))

    // Suggestions — random active traders you haven't connected with
    const suggestions = await db.user.findMany({
      where: {
        id: { notIn: Array.from(friendIds) },
        NOT: { id: uid }, // extra safety — never show yourself
      },
      select: { id: true, name: true, image: true, username: true, bio: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    // Include currentUserId so the page can identify which side is "you"
    return NextResponse.json({ pendingReceived, pendingSent, friends, suggestions, currentUserId: uid }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('[FRIENDS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
