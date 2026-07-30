import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradePips } from '@/lib/trading'

// Opt-in member leaderboard. Only users who turned on "share my stats" appear,
// and only their aggregate numbers are exposed.
//
// Every metric ships in one payload rather than one ranked list: the board has
// four categories (pips, amount, win rate, average) and each one ranks a
// different set of people, so a server-side sort-and-slice would truncate the
// other three. The opted-in pool is small, so the client sorts and slices.
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
    select: {
      authorId: true, pnl: true, result: true, createdAt: true,
      symbol: true, direction: true, entryPrice: true, exitPrice: true,
    },
  })

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  interface Agg {
    pnl: number; wins: number; losses: number; trades: number; entries: number
    pips: number; pipTrades: number; activeThisWeek: boolean
  }
  const blank = (): Agg => ({ pnl: 0, wins: 0, losses: 0, trades: 0, entries: 0, pips: 0, pipTrades: 0, activeThisWeek: false })

  const agg = new Map<string, Agg>()
  for (const e of entries) {
    const a = agg.get(e.authorId) ?? blank()
    a.entries++
    if (e.pnl != null) { a.pnl += e.pnl; a.trades++ }
    if (e.result === 'win') a.wins++
    else if (e.result === 'loss') a.losses++
    if (new Date(e.createdAt).getTime() >= weekAgo) a.activeThisWeek = true
    // Pips need the prices — a hand-typed P&L says nothing about how far the
    // trade actually ran, so those entries sit out the pips board.
    if (e.symbol && e.direction && e.entryPrice != null && e.exitPrice != null) {
      const p = tradePips({ symbol: e.symbol, direction: e.direction, entry: e.entryPrice, exit: e.exitPrice })
      if (p != null) { a.pips += p; a.pipTrades++ }
    }
    agg.set(e.authorId, a)
  }

  const rows = users
    .map(u => {
      const a = agg.get(u.id) ?? blank()
      const decided = a.wins + a.losses
      return {
        id: u.id, name: u.name, username: u.username, image: u.image,
        pnl: Math.round(a.pnl * 100) / 100,
        pips: Math.round(a.pips),
        pipTrades: a.pipTrades,
        trades: a.trades,
        decided,
        avgPnl: a.trades ? Math.round((a.pnl / a.trades) * 100) / 100 : null,
        winRate: decided ? Math.round((a.wins / decided) * 100) : null,
        entries: a.entries,
        activeThisWeek: a.activeThisWeek,
      }
    })
    .filter(r => r.entries > 0)

  return NextResponse.json(rows)
}
