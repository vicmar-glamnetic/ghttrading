import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { jitsiUrl } from '@/lib/jitsi'
import { jaasConfigured, signJaasToken, jaasRoomUrl } from '@/lib/jaas'

// Returns the embeddable room URL for the current live room.
// - JaaS configured  → a signed URL; staff (coach/admin) join as moderator,
//   everyone else as a guest. Moderator status is enforced by 8x8.
// - Not configured   → free public meet.jit.si (moderator = whoever joins first).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webinar = await db.liveWebinar.findUnique({ where: { id: 'default' } })
  if (!webinar || webinar.mode !== 'room' || !webinar.isLive || !webinar.roomName) {
    return NextResponse.json({ error: 'No live room' }, { status: 404 })
  }

  const isStaff = session.user.role === 'admin' || session.user.role === 'coach'
  const opts = { moderator: isStaff, displayName: session.user.name }

  if (jaasConfigured()) {
    const token = signJaasToken({
      userId: session.user.id,
      name: session.user.name,
      avatar: session.user.image,
      moderator: isStaff,
    })
    return NextResponse.json({ url: jaasRoomUrl(webinar.roomName, token, opts), moderator: isStaff })
  }

  // Fallback: free public meet.jit.si. Moderator isn't enforced here (join-first),
  // but members still get the receive-only, watch-and-chat config.
  return NextResponse.json({ url: jitsiUrl(webinar.roomName, opts), moderator: false })
}
