import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'

// Community chat room. GET recent (or since a timestamp for polling); POST a message.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new URL(req.url).searchParams.get('since')
  const where = since ? { createdAt: { gt: new Date(since) } } : {}
  const messages = await db.chatMessage.findMany({
    where,
    orderBy: { createdAt: since ? 'asc' : 'desc' },
    take: since ? 100 : 50,
    include: { author: USER_LITE },
  })
  // Newest-first when loading initial batch → return chronological.
  return NextResponse.json(since ? messages : messages.reverse())
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  const text = (content ?? '').toString().trim()
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  const message = await db.chatMessage.create({
    data: { content: text.slice(0, 2000), authorId: session.user.id },
    include: { author: USER_LITE },
  })
  return NextResponse.json(message, { status: 201 })
}
