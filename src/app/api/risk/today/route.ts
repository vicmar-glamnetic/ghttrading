import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Today's realised damage, measured against the member's own guardrails.
 *
 * The client passes its local date (?date=YYYY-MM-DD) rather than us assuming
 * one. tradedAt is stored as midnight UTC of the date the member picked, and our
 * members are in PH (UTC+8) while the server runs UTC — deriving "today" here
 * would roll the trading day over eight hours early for them.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = new URL(req.url).searchParams.get('date') || ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10)
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  const [user, entries] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { dailyLossLimit: true, maxTradesPerDay: true },
    }),
    db.journalEntry.findMany({
      where: { authorId: session.user.id, tradedAt: { gte: start, lt: end } },
      select: { pnl: true, rMultiple: true, result: true },
    }),
  ])

  const pnl = entries.reduce((s, e) => s + (e.pnl ?? 0), 0)
  const withR = entries.filter(e => e.rMultiple != null)
  const r = withR.length ? withR.reduce((s, e) => s + (e.rMultiple ?? 0), 0) : null
  const trades = entries.length
  const losses = entries.filter(e => e.result === 'loss').length

  const lossLimit = user?.dailyLossLimit ?? null
  const maxTrades = user?.maxTradesPerDay ?? null

  return NextResponse.json({
    date,
    pnl: Math.round(pnl * 100) / 100,
    r: r == null ? null : Math.round(r * 100) / 100,
    trades,
    losses,
    lossLimit,
    maxTrades,
    // A guardrail only counts as hit when the member actually set one.
    lossHit: lossLimit != null && pnl <= -Math.abs(lossLimit),
    tradesHit: maxTrades != null && trades >= maxTrades,
  })
}
