import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

interface TP { price?: number; pips?: number | null; hit?: boolean }

const mid = (lo: number | null, hi: number | null) => {
  if (lo != null && hi != null) return (lo + hi) / 2
  return lo ?? hi ?? null
}

// Planned reward:risk from prices (unit-agnostic ratio — no pip conversion).
function plannedRR(entry: number | null, sl: number | null, tps: TP[]): number | null {
  if (entry == null || sl == null) return null
  const firstTp = tps.find(t => Number.isFinite(t.price))?.price
  if (firstTp == null) return null
  const risk = Math.abs(entry - sl)
  const reward = Math.abs(firstTp - entry)
  if (risk <= 0) return null
  return reward / risk
}

// Aggregate performance of public trade ideas (signals). Win rate + counts are
// exact (from status); R:R is computed from prices.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ideas = await db.tradeIdea.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, image: true, username: true } } },
  })

  let wins = 0, losses = 0, open = 0
  const rrs: number[] = []
  const byCoach = new Map<string, { id: string; name: string | null; image: string | null; wins: number; losses: number }>()
  const byMonth = new Map<string, { wins: number; losses: number }>()

  for (const i of ideas) {
    const closed = i.status === 'tp_hit' || i.status === 'sl_hit'
    const win = i.status === 'tp_hit'
    if (i.status === 'pending') open++
    else if (win) wins++
    else if (i.status === 'sl_hit') losses++

    if (closed) {
      const rr = plannedRR(mid(i.entryLow, i.entryHigh), mid(i.slLow, i.slHigh), (i.takeProfits as TP[]) || [])
      if (rr != null) rrs.push(rr)

      const c = byCoach.get(i.authorId) ?? { id: i.authorId, name: i.author.name, image: i.author.image, wins: 0, losses: 0 }
      if (win) c.wins++; else c.losses++
      byCoach.set(i.authorId, c)

      const key = i.createdAt.toISOString().slice(0, 7) // YYYY-MM
      const m = byMonth.get(key) ?? { wins: 0, losses: 0 }
      if (win) m.wins++; else m.losses++
      byMonth.set(key, m)
    }
  }

  const closed = wins + losses
  const winRate = closed > 0 ? Math.round((wins / closed) * 100) : null
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : null

  const coaches = [...byCoach.values()]
    .map(c => ({ ...c, total: c.wins + c.losses, winRate: c.wins + c.losses > 0 ? Math.round((c.wins / (c.wins + c.losses)) * 100) : 0 }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total)

  const months = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v, total: v.wins + v.losses, winRate: v.wins + v.losses > 0 ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0 }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6)

  return NextResponse.json({
    total: ideas.length,
    open, wins, losses, closed, winRate,
    avgRR: avgRR != null ? Math.round(avgRR * 100) / 100 : null,
    coaches, months,
  })
}
