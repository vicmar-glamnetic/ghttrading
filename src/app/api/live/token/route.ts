import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jaasConfigured, signJaasToken, jaasRoomName } from '@/lib/jaas'

// Everything the client needs to mount the live room via Jitsi's external_api.js.
// - JaaS configured → 8x8.vc domain + signed JWT; staff join as moderator,
//   everyone else as a guest (enforced by 8x8).
// - Not configured  → free public meet.jit.si (moderator = whoever joins first).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webinar = await db.liveWebinar.findUnique({ where: { id: 'default' } })
  if (!webinar || webinar.mode !== 'room' || !webinar.isLive || !webinar.roomName) {
    return NextResponse.json({ error: 'No live room' }, { status: 404 })
  }

  const isStaff = session.user.role === 'admin' || session.user.role === 'coach'
  const displayName = session.user.name ?? 'Member'

  if (jaasConfigured()) {
    const jwt = signJaasToken({
      userId: session.user.id,
      name: session.user.name,
      avatar: session.user.image,
      moderator: isStaff,
    })
    return NextResponse.json({
      domain: '8x8.vc',
      roomName: jaasRoomName(webinar.roomName),
      jwt,
      moderator: isStaff,
      displayName,
    })
  }

  // Fallback: free public meet.jit.si (moderator not enforced — join-first).
  return NextResponse.json({
    domain: 'meet.jit.si',
    roomName: webinar.roomName,
    jwt: null,
    moderator: false,
    displayName,
  })
}
