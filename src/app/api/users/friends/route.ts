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

    // Suggestions, Facebook-style: friends of your friends first (most mutual
    // friends first), then the newest members to fill the rest.
    const LITE = { id: true, name: true, image: true, username: true } as const
    const myFriendIds = friends.map(f => (f.senderId === uid ? f.receiverId : f.senderId))
    const mutuals = new Map<string, string[]>() // candidate → mutual friend ids
    if (myFriendIds.length) {
      const edges = await db.friendRequest.findMany({
        where: { status: 'accepted', OR: [{ senderId: { in: myFriendIds } }, { receiverId: { in: myFriendIds } }] },
        select: { senderId: true, receiverId: true },
        take: 5000,
      })
      const mine = new Set(myFriendIds)
      // Admins are never suggested (they run the community, not trade in it).
      const admins = new Set((await db.user.findMany({ where: { role: 'admin' }, select: { id: true } })).map(a => a.id))
      for (const e of edges) {
        const [friend, candidate] = mine.has(e.senderId) ? [e.senderId, e.receiverId] : [e.receiverId, e.senderId]
        if (friendIds.has(candidate) || admins.has(candidate)) continue
        const list = mutuals.get(candidate) ?? []
        if (!list.includes(friend)) list.push(friend)
        mutuals.set(candidate, list)
      }
    }
    const ranked = [...mutuals.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 24).map(([id]) => id)
    const fill = ranked.length < 24
      ? await db.user.findMany({
          where: { id: { notIn: [...friendIds, ...ranked] }, role: { not: 'admin' } },
          select: { id: true },
          take: 24 - ranked.length,
          orderBy: { createdAt: 'desc' },
        })
      : []
    const candidateIds = [...ranked, ...fill.map(u => u.id)]
    const sampleIds = [...new Set(ranked.flatMap(id => mutuals.get(id)!.slice(0, 2)))]
    const [people, samples] = await Promise.all([
      db.user.findMany({ where: { id: { in: candidateIds } }, select: { ...LITE, bio: true, role: true } }),
      db.user.findMany({ where: { id: { in: sampleIds } }, select: LITE }),
    ])
    const byId = new Map(people.map(p => [p.id, p]))
    const sampleById = new Map(samples.map(p => [p.id, p]))
    const suggestions = candidateIds.flatMap(id => {
      const p = byId.get(id)
      if (!p) return []
      const m = mutuals.get(id) ?? []
      return [{ ...p, mutualCount: m.length, mutualSample: m.slice(0, 2).map(x => sampleById.get(x)).filter(Boolean) }]
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
