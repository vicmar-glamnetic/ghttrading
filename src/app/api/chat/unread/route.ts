import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Chat activity for the nav badge:
//  - count:      DM conversations with unread messages for me
//  - lastRoomAt: newest room (community/coach) message not sent by me, so the
//                nav can show a "new chat" dot (compared against a locally
//                stored last-seen time on the client).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0, lastRoomAt: null })
  const me = session.user.id

  const [convos, lastRoom] = await Promise.all([
    db.conversation.findMany({
      where: { OR: [{ user1Id: me }, { user2Id: me }] },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    db.chatMessage.findFirst({
      where: { NOT: { authorId: me } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const count = convos.filter(c => {
    const last = c.messages[0]
    if (!last || last.senderId === me) return false
    const myReadAt = c.user1Id === me ? c.user1ReadAt : c.user2ReadAt
    return !myReadAt || last.createdAt > myReadAt
  }).length

  return NextResponse.json({ count, lastRoomAt: lastRoom?.createdAt ?? null })
}
