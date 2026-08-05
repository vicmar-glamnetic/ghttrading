import { NextResponse, after } from 'next/server'
import { requireStaff } from '@/lib/admin'
import { db } from '@/lib/db'
import { parseSignal, DEFAULT_SYMBOL } from '@/lib/signalParse'
import { relaySignal, formatSignalText, type RelaySignal } from '@/lib/signalRelay'
import { sendPushToAll } from '@/lib/push'
import { emailNewSignal, formatEntryZone } from '@/lib/signalAlerts'

/**
 * Broadcast a trade message to the Telegram/Discord rooms, and optionally file
 * it as a signal on the app.
 *
 * The two halves are separate on purpose: most of what a coach sends the rooms
 * is an update ("close half here", "moved to breakeven") that shouldn't spawn a
 * new card on /ideas. Ticking "also post as a signal" is what creates one.
 *
 * The text is re-parsed here rather than trusting fields from the browser, so
 * the message and the stored signal can't disagree about what was posted.
 */

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

export async function POST(req: Request) {
  try {
    const session = await requireStaff()
    if (!session) return NextResponse.json({ error: 'Only coaches can post trade messages' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const text = (body.text ?? '').toString().trim()
    if (!text) return NextResponse.json({ error: 'Type a message before sending.' }, { status: 400 })

    const to: string[] = Array.isArray(body.to)
      ? body.to.filter((v: unknown): v is string => typeof v === 'string')
      : []
    const postToApp = Boolean(body.postToApp)
    if (to.length === 0 && !postToApp) {
      return NextResponse.json({ error: 'Pick at least one room, or tick “also post as a signal”.' }, { status: 400 })
    }

    const p = parseSignal(text)
    // An unnamed instrument is gold — see DEFAULT_SYMBOL.
    const symbol = (body.symbol ?? p.symbol ?? DEFAULT_SYMBOL).toString().trim().toUpperCase() || DEFAULT_SYMBOL
    const direction = (body.direction ?? p.direction) === 'sell' ? 'sell' : 'buy'
    const chartUrl = body.chartUrl?.toString().trim() || null

    // A signal on the app needs an entry to be worth anything; a message to the
    // rooms doesn't, so only guard the half that stores data. The symbol needs
    // no guard — an unnamed one falls back to gold.
    if (postToApp && p.entryLow == null && p.entryHigh == null) {
      return NextResponse.json({ error: 'No entry price found — add one before posting this to the app.' }, { status: 400 })
    }

    const takeProfits = p.takeProfits.map(price => ({ price, pips: null, hit: false }))
    // "Add more: 4098, 4001" — the scale-in levels the entry range can't hold.
    const notes = p.moreEntries.length ? `Add more: ${p.moreEntries.join(', ')}` : null

    const signal: RelaySignal = {
      symbol,
      direction,
      entryLow: p.entryLow,
      entryHigh: p.entryHigh,
      slLow: p.slLow,
      slHigh: p.slHigh,
      takeProfits: p.takeProfits.map(price => ({ price })),
      notes,
      chartUrl,
    }

    let idea = null
    if (postToApp) {
      idea = await db.tradeIdea.create({
        data: {
          symbol,
          direction,
          entryLow: p.entryLow,
          entryHigh: p.entryHigh,
          slLow: p.slLow,
          slHigh: p.slHigh,
          takeProfits,
          notes,
          chartUrl,
          isPublic: body.isPublic !== false,
          authorId: session.user.id,
        },
        include: { author: AUTHOR },
      })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL
    const url = base ? `${base}/ideas` : undefined

    // Relay inline so the coach is told which rooms actually took it — this is
    // the whole point of the screen, unlike the fire-and-forget alerts below.
    const relay = to.length > 0 ? await relaySignal(signal, { to, url }) : null

    // Same in-app alerts a signal posted from the composer would raise.
    if (idea?.isPublic) {
      const created = idea
      const authorId = session.user.id
      const entry = formatEntryZone(created.entryLow, created.entryHigh)
      after(async () => {
        await sendPushToAll(
          {
            title: `📈 New ${created.direction.toUpperCase()} signal · ${created.symbol}`,
            body: entry ? `Entry ${entry} — tap to view the full setup.` : 'Tap to view the full setup.',
            url: '/ideas',
            tag: `signal-${created.id}`,
          },
          authorId,
        ).catch(() => {})

        await emailNewSignal(
          {
            symbol: created.symbol,
            direction: created.direction,
            entry,
            targetCount: takeProfits.length,
            hasStop: created.slLow != null || created.slHigh != null,
          },
          authorId,
        )
      })
    }

    return NextResponse.json({ idea, relay, preview: formatSignalText(signal, { url }) }, { status: 201 })
  } catch (error) {
    console.error('[SIGNAL_MESSAGE_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
