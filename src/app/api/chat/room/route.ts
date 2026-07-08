import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'

const cleanRoom = (r: string | null) => (r || 'community').toString().slice(0, 64)

// Chat rooms (community or coach:<id>). GET recent (or since for polling); POST a message.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const room = cleanRoom(params.get('room'))
  const since = params.get('since')
  const messages = await db.chatMessage.findMany({
    where: { room, ...(since ? { createdAt: { gt: new Date(since) } } : {}) },
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

  const { content, room } = await req.json()
  const text = (content ?? '').toString().trim()
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  const message = await db.chatMessage.create({
    data: { room: cleanRoom(room), content: text.slice(0, 2000), authorId: session.user.id },
    include: { author: USER_LITE },
  })
  return NextResponse.json(message, { status: 201 })
}
