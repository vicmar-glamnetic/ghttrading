import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isGold, pipUnit, signalPips } from '@/lib/trading'

export const runtime = 'nodejs'

type TP = { price: number; pips?: number | null; hit?: boolean }

// Auto-posts a weekly performance recap to the feed. Triggered by Vercel Cron
// (Authorization: Bearer CRON_SECRET) or manually by an admin. A 6-day guard
// makes a daily cron effectively weekly and prevents duplicates.
export async function POST(req: Request) {
  // Auth: cron secret OR admin session.
  const secret = process.env.CRON_SECRET
  const authed = secret && req.headers.get('authorization') === `Bearer ${secret}`
  let authorId: string | null = null
  if (authed) {
    const admin = await db.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
    authorId = admin?.id ?? null
  } else {
    const session = await auth()
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    authorId = session.user.id
  }
  if (!authorId) return NextResponse.json({ error: 'No admin to author the recap' }, { status: 400 })

  // Skip if we already posted a recap in the last 6 days.
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  const recent = await db.post.findFirst({ where: { feeling: 'recap', createdAt: { gte: sixDaysAgo } }, select: { id: true } })
  if (recent) return NextResponse.json({ skipped: 'already posted this week' })

  // Signals closed in the last 7 days.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const closed = await db.tradeIdea.findMany({
    where: { isPublic: true, status: { in: ['tp_hit', 'sl_hit'] }, updatedAt: { gte: weekAgo } },
  })
  if (closed.length === 0) return NextResponse.json({ skipped: 'no closed signals this week' })

  // Win/loss counts cover every symbol. Pips are banked per instrument class —
  // gold headlines, other symbols get their own line under their own unit.
  const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  let wins = 0, losses = 0, net = 0
  const other = new Map<string, { pips: number; unit: 'pips' | 'points' }>()
  let best = { pips: -Infinity, symbol: '' }
  for (const i of closed) {
    if (i.status === 'tp_hit') wins++; else losses++
    const p = signalPips({
      symbol: i.symbol, direction: i.direction as 'buy' | 'sell',
      entryLow: i.entryLow, entryHigh: i.entryHigh, slLow: i.slLow, slHigh: i.slHigh,
      takeProfits: (i.takeProfits as TP[]) || [], status: i.status as 'tp_hit' | 'sl_hit',
    })
    if (p == null) continue
    if (isGold(i.symbol)) {
      net += p
      if (p > best.pips) best = { pips: p, symbol: i.symbol }
    } else {
      const sym = i.symbol.toUpperCase()
      const o = other.get(sym) ?? { pips: 0, unit: pipUnit(sym) }
      o.pips += p
      other.set(sym, o)
    }
  }
  const decided = wins + losses
  const winRate = decided ? Math.round((wins / decided) * 100) : 0

  const lines = [
    '📊 Weekly Recap',
    '',
    `This week: ${wins}W / ${losses}L (${winRate}% win rate)`,
    `Net on gold: ${signed(net)} pips 🎯`,
  ]
  if (best.symbol && best.pips > 0) lines.push(`Best call: ${best.symbol} +${best.pips} pips`)
  for (const [sym, o] of other) lines.push(`${sym}: ${signed(o.pips)} ${o.unit}`)
  lines.push('', 'Keep it up, team! 💪 Not financial advice.')

  const post = await db.post.create({
    data: { content: lines.join('\n'), images: [], feeling: 'recap', privacy: 'public', authorId },
    select: { id: true },
  })
  return NextResponse.json({ posted: post.id, wins, losses, winRate, net })
}
