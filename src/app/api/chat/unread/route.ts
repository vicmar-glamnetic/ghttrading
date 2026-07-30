import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Chat activity for the nav badge and the chat tabs:
//  - count: DM conversations with unread messages for me
//  - rooms: newest message per room that I didn't write, so the client can dot
//           each room it hasn't opened since (rooms have no read receipts —
//           see lib/chatSeen).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0, rooms: {} })
  const me = session.user.id

  const [convos, rooms] = await Promise.all([
    db.conversation.findMany({
      where: { OR: [{ user1Id: me }, { user2Id: me }] },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    db.chatMessage.groupBy({
      by: ['room'],
      where: { NOT: { authorId: me } },
      _max: { createdAt: true },
    }),
  ])

  const count = convos.filter(c => {
    const last = c.messages[0]
    if (!last || last.senderId === me) return false
    const myReadAt = c.user1Id === me ? c.user1ReadAt : c.user2ReadAt
    return !myReadAt || last.createdAt > myReadAt
  }).length

  const roomActivity: Record<string, string> = {}
  for (const r of rooms) {
    if (r._max.createdAt) roomActivity[r.room] = r._max.createdAt.toISOString()
  }

  return NextResponse.json({ count, rooms: roomActivity })
}
