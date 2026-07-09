import { NextResponse, after } from 'next/server'
import { requireStaff } from '@/lib/admin'
import { db } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'
import { signalPips } from '@/lib/trading'

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

function cleanTakeProfits(input: unknown) {
  if (!Array.isArray(input)) return []
  return input
    .map((t) => {
      const tp = t as { price?: unknown; pips?: unknown; hit?: unknown }
      const price = Number(tp?.price)
      if (!Number.isFinite(price)) return null
      const pips = Number(tp?.pips)
      return { price, pips: Number.isFinite(pips) ? pips : null, hit: Boolean(tp?.hit) }
    })
    .filter(Boolean)
}

const numOrNull = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))

export async function PUT(req: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  try {
    // Any coach/admin can edit any trade idea.
    const session = await requireStaff()
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ideaId } = await params
    const existing = await db.tradeIdea.findUnique({ where: { id: ideaId }, select: { id: true, status: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const symbol = (body.symbol ?? '').toString().trim().toUpperCase()
    if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })

    const updated = await db.tradeIdea.update({
      where: { id: ideaId },
      data: {
        symbol,
        direction: body.direction === 'sell' ? 'sell' : 'buy',
        entryLow: numOrNull(body.entryLow),
        entryHigh: numOrNull(body.entryHigh),
        slLow: numOrNull(body.slLow),
        slHigh: numOrNull(body.slHigh),
        takeProfits: cleanTakeProfits(body.takeProfits),
        currentPrice: numOrNull(body.currentPrice),
        status: ['pending', 'tp_hit', 'sl_hit', 'breakeven'].includes(body.status) ? body.status : 'pending',
        notes: body.notes?.toString().trim() || null,
        isPublic: Boolean(body.isPublic),
      },
      include: { author: AUTHOR },
    })

    // Celebrate a win: push when a public signal is newly marked TP hit.
    if (updated.isPublic && existing.status !== 'tp_hit' && updated.status === 'tp_hit') {
      const pips = signalPips({
        symbol: updated.symbol, direction: updated.direction as 'buy' | 'sell',
        entryLow: updated.entryLow, entryHigh: updated.entryHigh, slLow: updated.slLow, slHigh: updated.slHigh,
        takeProfits: (updated.takeProfits as { price: number; pips?: number | null; hit?: boolean }[]) || [],
        status: 'tp_hit',
      })
      const authorId = session.user.id
      after(async () => {
        await sendPushToAll({
          title: `🎯 TP hit · ${updated.symbol}`,
          body: pips != null ? `+${pips} pips — great call! See the result.` : 'Target hit — see the result.',
          url: '/ideas',
          tag: `result-${updated.id}`,
        }, authorId).catch(() => {})
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[IDEA_PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Quick-close a signal to a final outcome without opening the full editor.
// Body: { status: 'tp_hit' | 'sl_hit' | 'breakeven' | 'pending' } (pending re-opens).
const CLOSE_STATUSES = ['tp_hit', 'sl_hit', 'breakeven', 'pending']

export async function PATCH(req: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  try {
    const session = await requireStaff()
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ideaId } = await params
    const body = await req.json()
    const status = body?.status
    if (!CLOSE_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existing = await db.tradeIdea.findUnique({ where: { id: ideaId }, select: { id: true, status: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.tradeIdea.update({
      where: { id: ideaId },
      data: { status },
      include: { author: AUTHOR },
    })

    // Celebrate a win: push when a public signal is newly marked TP hit.
    if (updated.isPublic && existing.status !== 'tp_hit' && status === 'tp_hit') {
      const pips = signalPips({
        symbol: updated.symbol, direction: updated.direction as 'buy' | 'sell',
        entryLow: updated.entryLow, entryHigh: updated.entryHigh, slLow: updated.slLow, slHigh: updated.slHigh,
        takeProfits: (updated.takeProfits as { price: number; pips?: number | null; hit?: boolean }[]) || [],
        status: 'tp_hit',
      })
      const authorId = session.user.id
      after(async () => {
        await sendPushToAll({
          title: `🎯 TP hit · ${updated.symbol}`,
          body: pips != null ? `+${pips} pips — great call! See the result.` : 'Target hit — see the result.',
          url: '/ideas',
          tag: `result-${updated.id}`,
        }, authorId).catch(() => {})
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[IDEA_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  try {
    // Any coach/admin can delete any trade idea.
    const session = await requireStaff()
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ideaId } = await params
    const existing = await db.tradeIdea.findUnique({ where: { id: ideaId }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.tradeIdea.delete({ where: { id: ideaId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IDEA_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
