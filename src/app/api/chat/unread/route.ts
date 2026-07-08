import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Number of conversations with unread messages for me (for the nav badge).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0 })
  const me = session.user.id

  const convos = await db.conversation.findMany({
    where: { OR: [{ user1Id: me }, { user2Id: me }] },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const count = convos.filter(c => {
    const last = c.messages[0]
    if (!last || last.senderId === me) return false
    const myReadAt = c.user1Id === me ? c.user1ReadAt : c.user2ReadAt
    return !myReadAt || last.createdAt > myReadAt
  }).length

  return NextResponse.json({ count })
}
