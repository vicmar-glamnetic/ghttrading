/**
 * Spot gold (XAU/USD) trading hours.
 *
 * Gold trades on the forex week, not an exchange day: it opens Sunday 17:00 in
 * New York, runs continuously, and closes Friday 17:00 — with a one-hour
 * rollover break at 17:00 on the nights in between.
 *
 * Everything is measured against America/New_York wall-clock time through Intl
 * rather than a fixed UTC offset. The week's open and close follow US daylight
 * saving, so an offset hardcoded against either EST or EDT is an hour wrong for
 * half the year — and an hour wrong at exactly 17:00 on a Friday is the case
 * that matters.
 */

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MINS_PER_DAY = 24 * 60

const WEEK_OPEN = 0 * MINS_PER_DAY + 17 * 60 // Sunday 17:00 New York
const WEEK_CLOSE = 5 * MINS_PER_DAY + 17 * 60 // Friday 17:00 New York

/** The instant expressed as New York weekday + minutes since Sunday 00:00. */
function nyWeek(d: Date): { day: number; hour: number; weekMin: number } {
  const parts = NY.formatToParts(d)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const day = Math.max(0, DAYS.indexOf(part('weekday')))
  // h23 gives midnight as "00", but an engine falling back to h24 renders it
  // as "24" — which would put midnight on the wrong day.
  const hour = Number(part('hour')) % 24
  const minute = Number(part('minute'))
  return { day, hour, weekMin: day * MINS_PER_DAY + hour * 60 + minute }
}

/**
 * Is spot gold trading right now?
 *
 * Regular weekly hours only — it doesn't know about holidays, when the market
 * closes early or doesn't open at all. Fine for labelling a price widget; don't
 * gate anything that costs money on it.
 */
export function isGoldMarketOpen(at: Date = new Date()): boolean {
  const { day, hour, weekMin } = nyWeek(at)
  if (weekMin < WEEK_OPEN || weekMin >= WEEK_CLOSE) return false
  // Daily rollover break, 17:00–18:00 Monday through Thursday.
  return !(hour === 17 && day >= 1 && day <= 4)
}
