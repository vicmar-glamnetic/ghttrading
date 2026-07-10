import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { HEARTBEAT_WRITE_THROTTLE_MS, ONLINE_WINDOW_MS } from '@/lib/presence'

/** Cap on the "who's online" list — the count is exact, the roster is trimmed. */
const ONLINE_LIST_LIMIT = 24

/**
 * Who is on the site right now. Any signed-in member can see this; it powers the
 * "Online now" card in the sidebar.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = {
    lastSeenAt: { gt: new Date(Date.now() - ONLINE_WINDOW_MS) },
    approved: true, // never surface accounts still waiting on admin approval
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: ONLINE_LIST_LIMIT,
      select: { id: true, name: true, username: true, image: true, role: true, lastSeenAt: true },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({ users, total })
}

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
