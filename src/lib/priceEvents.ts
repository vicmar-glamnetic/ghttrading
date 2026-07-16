import { db } from './db'
import { sendPushToUsers } from './push'
import { normalizeSymbol } from './symbols'
import { mid } from './trading'

// Price-driven side effects, fired off the back of /api/price polls (no cron).
// Signals are closed manually by their author for every symbol, so what's left
// here is alerting: plain price alerts, and zone alerts that tell a member the
// moment a coach's signal actually becomes enterable.
//
// Throttled per symbol so a burst of client polls doesn't re-run the sweep, and
// so a poll for one symbol can't starve another's alerts. The map is
// per-instance, so several serverless instances can still sweep concurrently —
// the atomic claim in claim() is what keeps a member from being pushed twice.
const lastRun = new Map<string, number>()
const THROTTLE_MS = 40_000

export async function runPriceEvents(symbol: string, price: number) {
  const s = normalizeSymbol(symbol)
  const now = Date.now()
  if (now - (lastRun.get(s) ?? 0) < THROTTLE_MS) return
  lastRun.set(s, now)
  await Promise.allSettled([checkPriceAlerts(s, price), checkZoneAlerts(s, price)])
}

/**
 * Claim an alert before pushing. updateMany with triggered:false in the WHERE is
 * a compare-and-set: whichever instance gets count 1 owns the notification and
 * the rest get 0 and stay quiet. (The old code read, then wrote, which let two
 * instances both decide to push.)
 */
async function claim(id: string): Promise<boolean> {
  const { count } = await db.priceAlert.updateMany({
    where: { id, triggered: false },
    data: { triggered: true },
  })
  return count === 1
}

async function checkPriceAlerts(symbol: string, price: number) {
  const alerts = await db.priceAlert.findMany({
    where: { triggered: false, kind: 'price', symbol },
  })
  for (const a of alerts) {
    const crossed = a.direction === 'above' ? price >= a.targetPrice : price <= a.targetPrice
    if (!crossed) continue
    if (!(await claim(a.id))) continue
    await sendPushToUsers([a.userId], {
      title: `🔔 ${a.symbol} hit ${a.targetPrice}`,
      body: `Price is now ${price} (${a.direction} your alert).`,
      url: '/chart',
      tag: `alert-${a.id}`,
    }).catch(() => {})
  }
}

/**
 * Zone alerts: fire when price trades into a signal's entry zone — what a member
 * actually wants to know, instead of a number they had to pick themselves.
 * Skips signals the coach has already closed or cancelled, since telling someone
 * a dead setup is "enterable now" is worse than staying quiet.
 */
async function checkZoneAlerts(symbol: string, price: number) {
  const alerts = await db.priceAlert.findMany({
    where: { triggered: false, kind: 'zone', symbol, ideaId: { not: null } },
    include: { idea: true },
  })
  for (const a of alerts) {
    const idea = a.idea
    if (!idea) continue
    if (idea.status !== 'pending' && idea.status !== 'running') continue

    const lo = Math.min(idea.entryLow ?? NaN, idea.entryHigh ?? (idea.entryLow ?? NaN))
    const hi = Math.max(idea.entryHigh ?? NaN, idea.entryLow ?? (idea.entryHigh ?? NaN))
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue
    if (price < lo || price > hi) continue

    if (!(await claim(a.id))) continue
    const zone = lo === hi ? `${lo}` : `${lo}–${hi}`
    const sl = mid(idea.slLow, idea.slHigh)
    await sendPushToUsers([a.userId], {
      title: `🎯 ${idea.symbol} ${idea.direction.toUpperCase()} is in the zone`,
      body: `Price ${price} entered ${zone}${sl != null ? ` · SL ${sl}` : ''} — tap to check the signal.`,
      url: '/ideas',
      tag: `zone-${a.id}`,
    }).catch(() => {})
  }
}
