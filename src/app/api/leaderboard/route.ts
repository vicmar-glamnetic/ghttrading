import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Opt-in member leaderboard, ranked by journaled net P&L. Only users who turned
// on "share my stats" appear, and only their aggregate numbers are exposed.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await db.user.findMany({
    where: { shareStats: true },
    select: { id: true, name: true, username: true, image: true },
  })
  if (users.length === 0) return NextResponse.json([])

  const ids = users.map(u => u.id)
  const entries = await db.journalEntry.findMany({
    where: { authorId: { in: ids } },
    select: { authorId: true, pnl: true, result: true, createdAt: true },
  })

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const agg = new Map<string, { pnl: number; wins: number; losses: number; trades: number; entries: number; activeThisWeek: boolean }>()
  for (const e of entries) {
    const a = agg.get(e.authorId) ?? { pnl: 0, wins: 0, losses: 0, trades: 0, entries: 0, activeThisWeek: false }
    a.entries++
    if (e.pnl != null) { a.pnl += e.pnl; a.trades++ }
    if (e.result === 'win') a.wins++
    else if (e.result === 'loss') a.losses++
    if (new Date(e.createdAt).getTime() >= weekAgo) a.activeThisWeek = true
    agg.set(e.authorId, a)
  }

  const rows = users
    .map(u => {
      const a = agg.get(u.id) ?? { pnl: 0, wins: 0, losses: 0, trades: 0, entries: 0, activeThisWeek: false }
      const decided = a.wins + a.losses
      return {
        id: u.id, name: u.name, username: u.username, image: u.image,
        pnl: Math.round(a.pnl * 100) / 100, trades: a.trades,
        entries: a.entries, activeThisWeek: a.activeThisWeek,
        winRate: decided ? Math.round((a.wins / decided) * 100) : null,
      }
    })
    .filter(r => r.trades > 0 || r.winRate != null || r.entries > 0)
    .sort((x, y) => (y.winRate ?? -1) - (x.winRate ?? -1) || y.trades - x.trades)
    .slice(0, 50)

  return NextResponse.json(rows)
}
