import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizeSymbol, isPriceable } from '@/lib/symbols'
import { mid } from '@/lib/trading'

const MAX_OPEN_ALERTS = 20

// List my alerts (price + zone).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const alerts = await db.priceAlert.findMany({
    where: { userId: session.user.id },
    orderBy: [{ triggered: 'asc' }, { createdAt: 'desc' }],
    include: { idea: { select: { id: true, symbol: true, direction: true, entryLow: true, entryHigh: true, status: true } } },
  })
  return NextResponse.json(alerts)
}

/**
 * Create an alert.
 *   { symbol, targetPrice, direction }  -> plain price alert
 *   { ideaId }                          -> zone alert on that signal
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const open = await db.priceAlert.count({ where: { userId: session.user.id, triggered: false } })
  if (open >= MAX_OPEN_ALERTS) {
    return NextResponse.json({ error: `Alert limit reached (${MAX_OPEN_ALERTS}). Remove some first.` }, { status: 400 })
  }

  // ---- zone alert -------------------------------------------------------
  if (body.ideaId) {
    const idea = await db.tradeIdea.findUnique({ where: { id: body.ideaId } })
    if (!idea) return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    if (!idea.isPublic && idea.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }
    if (idea.status !== 'pending' && idea.status !== 'running') {
      return NextResponse.json({ error: 'That signal is already closed.' }, { status: 400 })
    }
    const zoneMid = mid(idea.entryLow, idea.entryHigh)
    if (zoneMid == null) {
      return NextResponse.json({ error: 'That signal has no entry zone to watch.' }, { status: 400 })
    }
    const symbol = normalizeSymbol(idea.symbol)
    if (!isPriceable(symbol)) {
      return NextResponse.json(
        { error: `We can't track live prices for ${idea.symbol} yet, so we can't alert on this zone.` },
        { status: 400 },
      )
    }
    // One per member per signal — upsert so tapping twice is idempotent rather
    // than a unique-constraint error in the member's face.
    const alert = await db.priceAlert.upsert({
      where: { one_zone_alert_per_signal: { userId: session.user.id, ideaId: idea.id } },
      create: {
        userId: session.user.id,
        ideaId: idea.id,
        kind: 'zone',
        symbol,
        targetPrice: zoneMid,
        direction: 'above', // unused for zone alerts; the zone is read off the idea
      },
      update: { triggered: false },
      include: { idea: { select: { id: true, symbol: true, direction: true, entryLow: true, entryHigh: true, status: true } } },
    })
    return NextResponse.json(alert, { status: 201 })
  }

  // ---- plain price alert ------------------------------------------------
  const symbol = normalizeSymbol(body.symbol || 'XAUUSD')
  const targetPrice = Number(body.targetPrice)
  const direction = body.direction === 'below' ? 'below' : 'above'
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }
  if (!isPriceable(symbol)) {
    return NextResponse.json({ error: `We can't track live prices for ${symbol} yet.` }, { status: 400 })
  }

  const alert = await db.priceAlert.create({
    data: { userId: session.user.id, symbol, targetPrice, direction, kind: 'price' },
  })
  return NextResponse.json(alert, { status: 201 })
}

// Delete one of my alerts. Accepts an alert id, or an ideaId to drop a zone alert.
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ideaId } = await req.json().catch(() => ({}))
  if (id) await db.priceAlert.deleteMany({ where: { id, userId: session.user.id } })
  else if (ideaId) await db.priceAlert.deleteMany({ where: { ideaId, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
