import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'
import { sendPushToUsers } from '@/lib/push'

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

  const cleaned = cleanRoom(room)
  const message = await db.chatMessage.create({
    data: { room: cleaned, content: text.slice(0, 2000), authorId: session.user.id },
    include: { author: USER_LITE },
  })

  // Notify the coach when someone posts in their own room (coach:<id>).
  // Never let a notification hiccup fail the message itself.
  const coachId = cleaned.startsWith('coach:') ? cleaned.slice('coach:'.length) : null
  if (coachId && coachId !== session.user.id) {
    try {
      const coach = await db.user.findUnique({ where: { id: coachId }, select: { role: true } })
      if (coach?.role === 'coach') {
        const preview = text.slice(0, 120)
        const notifMessage = `${session.user.name || 'A member'} messaged your room: ${preview}`
        // Coalesce: bump the coach's existing unread room notification instead
        // of stacking one per message, so a busy room doesn't flood the bell.
        const existing = await db.notification.findFirst({
          where: { receiverId: coachId, type: 'coach_room', read: false },
          select: { id: true },
        })
        if (existing) {
          await db.notification.update({
            where: { id: existing.id },
            data: { message: notifMessage, senderId: session.user.id, createdAt: new Date() },
          })
        } else {
          await db.notification.create({
            data: {
              type: 'coach_room',
              message: notifMessage,
              receiverId: coachId,
              senderId: session.user.id,
              link: `/chat?room=coach:${coachId}`,
            },
          })
        }
        await sendPushToUsers([coachId], {
          title: 'New message in your room',
          body: `${session.user.name || 'A member'}: ${preview}`,
          url: `/chat?room=coach:${coachId}`,
          tag: 'coach-room',
        })
      }
    } catch (err) {
      console.error('[CHAT_ROOM_NOTIFY]', err)
    }
  }

  return NextResponse.json(message, { status: 201 })
}
