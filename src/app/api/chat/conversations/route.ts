import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'

// List my DM conversations (most recent first) with the other user, last
// message preview, and an unread flag.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id

  const convos = await db.conversation.findMany({
    where: { OR: [{ user1Id: me }, { user2Id: me }] },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user1: USER_LITE,
      user2: USER_LITE,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  const list = convos.map(c => {
    const other = c.user1Id === me ? c.user2 : c.user1
    const myReadAt = c.user1Id === me ? c.user1ReadAt : c.user2ReadAt
    const last = c.messages[0] ?? null
    const unread = !!last && last.senderId !== me && (!myReadAt || last.createdAt > myReadAt)
    return {
      id: c.id,
      other,
      lastMessage: last ? { content: last.content, createdAt: last.createdAt, senderId: last.senderId } : null,
      unread,
    }
  })

  return NextResponse.json(list)
}
