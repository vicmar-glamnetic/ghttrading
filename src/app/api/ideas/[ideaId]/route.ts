import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ideaId } = await params
    const existing = await db.tradeIdea.findUnique({ where: { id: ideaId }, select: { authorId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
        status: ['pending', 'tp_hit', 'sl_hit'].includes(body.status) ? body.status : 'pending',
        notes: body.notes?.toString().trim() || null,
        isPublic: Boolean(body.isPublic),
      },
      include: { author: AUTHOR },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[IDEA_PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ideaId } = await params
    const existing = await db.tradeIdea.findUnique({ where: { id: ideaId }, select: { authorId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.tradeIdea.delete({ where: { id: ideaId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IDEA_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
