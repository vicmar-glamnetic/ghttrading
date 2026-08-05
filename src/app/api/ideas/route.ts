import { NextResponse, after } from 'next/server'
import { auth } from '@/lib/auth'
import { requireStaff } from '@/lib/admin'
import { db } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'
import { emailNewSignal, formatEntryZone } from '@/lib/signalAlerts'

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
    .filter((t): t is { price: number; pips: number | null; hit: boolean } => t !== null)
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

    // Attach community sentiment (take/skip counts + my vote) and my zone alerts
    // in batched queries — one per concern, not one per card.
    const ids = ideas.map(i => i.id)
    const [grouped, myVotes, myAlerts] = await Promise.all([
      db.signalVote.groupBy({ by: ['ideaId', 'vote'], where: { ideaId: { in: ids } }, _count: true }),
      db.signalVote.findMany({ where: { ideaId: { in: ids }, userId: session.user.id }, select: { ideaId: true, vote: true } }),
      db.priceAlert.findMany({
        where: { ideaId: { in: ids }, userId: session.user.id, kind: 'zone', triggered: false },
        select: { ideaId: true },
      }),
    ])
    const watching = new Set(myAlerts.map(a => a.ideaId))
    const counts = new Map<string, { take: number; skip: number }>()
    for (const g of grouped) {
      const c = counts.get(g.ideaId) ?? { take: 0, skip: 0 }
      if (g.vote === 'take') c.take = g._count; else if (g.vote === 'skip') c.skip = g._count
      counts.set(g.ideaId, c)
    }
    const mine = new Map(myVotes.map(v => [v.ideaId, v.vote]))
    const withVotes = ideas.map(i => ({
      ...i,
      votes: { take: counts.get(i.id)?.take ?? 0, skip: counts.get(i.id)?.skip ?? 0, mine: mine.get(i.id) ?? null },
      zoneAlert: watching.has(i.id),
    }))

    return NextResponse.json(withVotes)
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

    // Guard against empty signals (e.g. a coach who forgot to parse their paste):
    // require an entry, and at least a target or a stop.
    const entryLow = numOrNull(body.entryLow)
    const entryHigh = numOrNull(body.entryHigh)
    const slLow = numOrNull(body.slLow)
    const slHigh = numOrNull(body.slHigh)
    const takeProfits = cleanTakeProfits(body.takeProfits)
    if (entryLow == null && entryHigh == null) {
      return NextResponse.json({ error: 'Add an entry price before posting this signal.' }, { status: 400 })
    }
    if (takeProfits.length === 0 && slLow == null && slHigh == null) {
      return NextResponse.json({ error: 'Add at least one take-profit or a stop loss before posting.' }, { status: 400 })
    }

    const idea = await db.tradeIdea.create({
      data: {
        symbol,
        direction,
        entryLow,
        entryHigh,
        slLow,
        slHigh,
        takeProfits,
        currentPrice: numOrNull(body.currentPrice),
        status: ['pending', 'running', 'tp_hit', 'sl_hit', 'breakeven', 'closed', 'cancelled'].includes(body.status) ? body.status : 'pending',
        notes: body.notes?.toString().trim() || null,
        chartUrl: body.chartUrl?.toString().trim() || null,
        isPublic: Boolean(body.isPublic),
        authorId: session.user.id,
      },
      include: { author: AUTHOR },
    })

    // Alert everyone when a new public signal drops — after the response.
    if (idea.isPublic) {
      const dir = idea.direction.toUpperCase()
      const entry = formatEntryZone(idea.entryLow, idea.entryHigh)
      const authorId = session.user.id
      after(async () => {
        await sendPushToAll(
          {
            title: `📈 New ${dir} signal · ${idea.symbol}`,
            body: entry ? `Entry ${entry} — tap to view the full setup.` : 'Tap to view the full setup.',
            url: '/ideas',
            tag: `signal-${idea.id}`,
          },
          authorId,
        ).catch(() => {})

        // Push only reaches members who enabled it. The email covers everyone
        // else — but only while the admin toggle on /admin/settings is on.
        await emailNewSignal(
          {
            symbol: idea.symbol,
            direction: idea.direction,
            entry,
            targetCount: takeProfits.length,
            hasStop: slLow != null || slHigh != null,
          },
          authorId,
        )
      })
    }

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('[IDEAS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
