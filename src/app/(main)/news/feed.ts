export interface CalendarEvent {
  title: string
  currency: string
  impact: 'high' | 'medium' | 'low' | 'holiday'
  forecast: string
  previous: string
  url: string
  ts: number // epoch ms (UTC)
  timed: boolean // false for All Day / Tentative events
}

// ForexFactory's own weekly calendar feed. The site itself (forexfactory.com)
// sits behind Cloudflare and 403s any server-side request, so this is the only
// first-party route to the data. It rate-limits aggressively — never fetch it
// per-request.
export const FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml'

function pick(block: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block)
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .trim()
}

// Feed times are UTC. Events with no clock time (All Day / Tentative) are
// pinned to the start of their UTC day and flagged untimed.
export function toTimestamp(date: string, time: string): { ts: number; timed: boolean } | null {
  const d = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date)
  if (!d) return null
  const [, mm, dd, yyyy] = d
  const t = /^(\d{1,2}):(\d{2})(am|pm)$/i.exec(time)
  if (!t) return { ts: Date.UTC(+yyyy, +mm - 1, +dd), timed: false }
  let hour = +t[1] % 12
  if (t[3].toLowerCase() === 'pm') hour += 12
  return { ts: Date.UTC(+yyyy, +mm - 1, +dd, hour, +t[2]), timed: true }
}

function normalizeImpact(raw: string): CalendarEvent['impact'] {
  const v = raw.toLowerCase()
  if (v === 'high' || v === 'medium' || v === 'low' || v === 'holiday') return v
  return 'low'
}

export function parseFeed(xml: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const re = /<event>([\s\S]*?)<\/event>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const block = m[1]
    const title = pick(block, 'title')
    const when = toTimestamp(pick(block, 'date'), pick(block, 'time'))
    if (!title || !when) continue
    events.push({
      title,
      currency: pick(block, 'country'),
      impact: normalizeImpact(pick(block, 'impact')),
      forecast: pick(block, 'forecast'),
      previous: pick(block, 'previous'),
      url: pick(block, 'url'),
      ts: when.ts,
      timed: when.timed,
    })
  }
  return events.sort((a, b) => a.ts - b.ts)
}

// We only trade gold, so the dollar leg is the only one that moves our charts.
export const CURRENCY = 'USD'

export async function fetchCalendar(): Promise<CalendarEvent[]> {
  const read = async (init: RequestInit) => {
    const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, ...init })
    if (!res.ok) return []
    // Feed is declared windows-1252; decoding as utf-8 mangles accented event names.
    const xml = new TextDecoder('windows-1252').decode(await res.arrayBuffer())
    return parseFeed(xml)
  }

  // Filter after the emptiness check below, so a week with no USD events isn't
  // mistaken for a rate-limited reply.
  const usdOnly = (events: CalendarEvent[]) => events.filter(e => e.currency === CURRENCY)

  try {
    // A rate-limited reply is an HTML page, not XML, and would otherwise get
    // cached as "no events" for the full window — retry uncached before giving up.
    const cached = await read({ next: { revalidate: 900 } })
    if (cached.length) return usdOnly(cached)
    return usdOnly(await read({ cache: 'no-store' }))
  } catch {
    return []
  }
}
