import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'

// Messages in a conversation (+ marks it read for me). GET recent or since.
export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id

  const { conversationId } = await params
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { user1: USER_LITE, user2: USER_LITE },
  })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (convo.user1Id !== me && convo.user2Id !== me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new URL(req.url).searchParams.get('since')
  let messages
  if (since) {
    messages = await db.directMessage.findMany({
      where: { conversationId, createdAt: { gt: new Date(since) } },
      orderBy: { createdAt: 'asc' }, take: 100, include: { sender: USER_LITE },
    })
  } else {
    const recent = await db.directMessage.findMany({
      where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 100, include: { sender: USER_LITE },
    })
    messages = recent.reverse()
  }

  // Mark read for me.
  await db.conversation.update({
    where: { id: conversationId },
    data: convo.user1Id === me ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() },
  })

  const other = convo.user1Id === me ? convo.user2 : convo.user1
  return NextResponse.json({ messages, other })
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id

  const { conversationId } = await params
  const convo = await db.conversation.findUnique({ where: { id: conversationId }, select: { user1Id: true, user2Id: true } })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (convo.user1Id !== me && convo.user2Id !== me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await req.json()
  const text = (content ?? '').toString().trim()
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  const now = new Date()
  const message = await db.directMessage.create({
    data: { conversationId, senderId: me, content: text.slice(0, 4000) },
    include: { sender: USER_LITE },
  })
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: now, ...(convo.user1Id === me ? { user1ReadAt: now } : { user2ReadAt: now }) },
  })

  return NextResponse.json(message, { status: 201 })
}
