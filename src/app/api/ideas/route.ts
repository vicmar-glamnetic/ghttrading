import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireStaff } from '@/lib/admin'
import { db } from '@/lib/db'

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

// Normalise a submitted take-profit list into [{ price, pips?, hit? }]
function cleanTakeProfits(input: unknown) {
  if (!Array.isArray(input)) return []
  return input
    .map((t) => {
      const tp = t as { price?: unknown; pips?: unknown; hit?: unknown }
      const price = Number(tp?.price)
      if (!Number.isFinite(price)) return null
      const pips = Number(tp?.pips)
      return {
        price,
        pips: Number.isFinite(pips) ? pips : null,
        hit: Boolean(tp?.hit),
      }
    })
    .filter(Boolean)
}

const numOrNull = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = new URL(req.url).searchParams.get('scope') ?? 'community'

    const where =
      scope === 'mine'
        ? { authorId: session.user.id }
        : { OR: [{ isPublic: true }, { authorId: session.user.id }] }

    const ideas = await db.tradeIdea.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: AUTHOR },
    })

    return NextResponse.json(ideas)
  } catch (error) {
    console.error('[IDEAS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Only coaches/admins may create trade ideas.
    const session = await requireStaff()
    if (!session) return NextResponse.json({ error: 'Only coaches can create trade ideas' }, { status: 403 })

    const body = await req.json()
    const symbol = (body.symbol ?? '').toString().trim().toUpperCase()
    const direction = body.direction === 'sell' ? 'sell' : 'buy'
    if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })

    const idea = await db.tradeIdea.create({
      data: {
        symbol,
        direction,
        entryLow: numOrNull(body.entryLow),
        entryHigh: numOrNull(body.entryHigh),
        slLow: numOrNull(body.slLow),
        slHigh: numOrNull(body.slHigh),
        takeProfits: cleanTakeProfits(body.takeProfits),
        currentPrice: numOrNull(body.currentPrice),
        status: ['pending', 'tp_hit', 'sl_hit'].includes(body.status) ? body.status : 'pending',
        notes: body.notes?.toString().trim() || null,
        isPublic: Boolean(body.isPublic),
        authorId: session.user.id,
      },
      include: { author: AUTHOR },
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('[IDEAS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
