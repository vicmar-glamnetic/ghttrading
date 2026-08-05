import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { formatSignalText, type RelaySignal } from '@/lib/signalRelay'

/**
 * An RSS 2.0 feed of public signals, for relaying into Telegram without a bot
 * of our own: a public feed bot (e.g. @TheFeedReaderBot) is added to the group
 * as an admin and pointed at this URL, then posts each new signal as it appears.
 * See docs/signal-relay.md.
 *
 * This is the one place signals leave the login. It is therefore:
 *   • off unless SIGNAL_FEED_TOKEN is set — no env var, no feed;
 *   • gated on ?k=<token>, compared in constant time, 404 on a miss so the URL
 *     doesn't confirm the endpoint exists to someone guessing;
 *   • public signals only, never a coach's private ideas;
 *   • never cached, by us or by a CDN — the token is in the URL.
 *
 * Anyone holding the URL reads the signals, so treat it like a password: a
 * secret link is genuinely weaker than the login gate, which is why the token
 * is long and rotatable (change the env var and every old URL dies).
 */

const FEED_LIMIT = 20

/** Constant-time string compare that doesn't leak length through early exit. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still burn a comparison so a wrong-length guess isn't measurably faster.
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** Feed bots lead with the title, so it has to carry the trade on its own. */
function itemTitle(s: RelaySignal): string {
  const dir = s.direction === 'sell' ? 'SELL' : 'BUY'
  const dot = s.direction === 'sell' ? '🔴' : '🟢'
  const entry = [s.entryLow, s.entryHigh]
    .filter((n): n is number => n != null)
    .filter((n, i, a) => a.indexOf(n) === i)
    .sort((x, y) => (s.direction === 'sell' ? y - x : x - y))
    .join('-')
  return `${dot} ${s.symbol.toUpperCase()} ${dir}${entry ? ` — ${entry}` : ''}`
}

// Prisma hands takeProfits back as Json; pull out the prices defensively.
function toTakeProfits(json: unknown): { price: number }[] {
  if (!Array.isArray(json)) return []
  return json
    .map(t => Number((t as { price?: unknown })?.price))
    .filter(n => Number.isFinite(n))
    .map(price => ({ price }))
}

export async function GET(req: Request) {
  const token = process.env.SIGNAL_FEED_TOKEN
  const key = new URL(req.url).searchParams.get('k') ?? ''
  // A missing token means the feature was never turned on; both cases 404 so
  // the response can't be used to probe for it.
  if (!token || !safeEqual(key, token)) {
    return new Response('Not found', { status: 404 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
  const ideas = await db.tradeIdea.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: FEED_LIMIT,
  })

  const items = ideas.map(idea => {
    const signal: RelaySignal = {
      symbol: idea.symbol,
      direction: idea.direction,
      entryLow: idea.entryLow,
      entryHigh: idea.entryHigh,
      slLow: idea.slLow,
      slHigh: idea.slHigh,
      takeProfits: toTakeProfits(idea.takeProfits),
      notes: idea.notes,
      chartUrl: idea.chartUrl,
    }
    // The same body Telegram and Discord get, as HTML so the line breaks survive.
    const text = formatSignalText(signal, { url: base ? `${base}/ideas` : undefined })
    const html =
      (idea.chartUrl ? `<p><img src="${xmlEscape(idea.chartUrl)}" alt="chart" /></p>` : '') +
      `<p>${xmlEscape(text).replace(/\n/g, '<br />')}</p>`

    // A per-signal link keeps bots that dedupe on URL from collapsing the feed.
    const link = base ? `${base}/ideas?signal=${idea.id}` : ''

    return [
      '    <item>',
      `      <title>${xmlEscape(itemTitle(signal))}</title>`,
      link ? `      <link>${xmlEscape(link)}</link>` : '',
      `      <guid isPermaLink="false">${idea.id}</guid>`,
      `      <pubDate>${idea.createdAt.toUTCString()}</pubDate>`,
      `      <description><![CDATA[${html}]]></description>`,
      idea.chartUrl ? `      <enclosure url="${xmlEscape(idea.chartUrl)}" type="image/jpeg" />` : '',
      '    </item>',
    ].filter(Boolean).join('\n')
  })

  const self = `${base}/api/signals/rss?k=${encodeURIComponent(key)}`
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlEscape(process.env.NEXT_PUBLIC_APP_NAME || 'GHT Trading')} — Signals</title>`,
    `    <link>${xmlEscape(base ? `${base}/ideas` : '')}</link>`,
    '    <description>New trade signals from the coaching desk.</description>',
    '    <language>en</language>',
    `    <lastBuildDate>${(ideas[0]?.createdAt ?? new Date()).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // The token rides in the URL — keep it out of every shared cache.
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
