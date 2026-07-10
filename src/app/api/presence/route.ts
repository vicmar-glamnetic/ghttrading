import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { HEARTBEAT_WRITE_THROTTLE_MS } from '@/lib/presence'

/**
 * Heartbeat from an open tab. Stamps users.lastSeenAt so admins can see who is
 * currently on the site.
 *
 * The updateMany guard is what keeps this cheap: a user with four tabs open, or
 * one hammering refresh, still writes at most once per throttle window because
 * rows already stamped inside it don't match.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.user.updateMany({
    where: {
      id: session.user.id,
      OR: [
        { lastSeenAt: null },
        { lastSeenAt: { lt: new Date(Date.now() - HEARTBEAT_WRITE_THROTTLE_MS) } },
      ],
    },
    data: { lastSeenAt: new Date() },
  })

  return new NextResponse(null, { status: 204 })
}
