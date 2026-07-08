import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orderPair } from '@/lib/chat'

// Get-or-create a 1-on-1 conversation with another user.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id

  const { userId } = await req.json()
  if (!userId || userId === me) return NextResponse.json({ error: 'Invalid user' }, { status: 400 })

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [user1Id, user2Id] = orderPair(me, userId)
  const convo = await db.conversation.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
    select: { id: true },
  })

  return NextResponse.json({ id: convo.id })
}
