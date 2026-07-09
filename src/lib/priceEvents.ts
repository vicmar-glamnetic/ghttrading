import { db } from './db'
import { sendPushToAll, sendPushToUsers } from './push'
import { signalPips } from './trading'

type TP = { price: number; pips?: number | null; hit?: boolean }

let lastRun = 0

// Run gold-price-driven side effects: auto-close signals that reached a TP, and
// fire any crossed price alerts. Throttled so a burst of client price polls
// doesn't re-run it. Piggybacks on the /api/price route (no cron needed).
export async function runGoldPriceEvents(price: number) {
  const now = Date.now()
  if (now - lastRun < 40000) return
  lastRun = now
  await Promise.allSettled([autoCloseGold(price), checkAlerts(price)])
}

// Mark TPs that price has reached and close the signal as tp_hit — but only once
// the entry has actually been filled. A TP sitting beyond the entry does NOT prove
// the trade was entered: e.g. a buy-limit below market (entry 4122–4126) can see
// price rise straight to a TP (4128) without ever dipping into the zone, so the
// trade never triggered. We gate on `entered` to avoid those false wins.
async function autoCloseGold(price: number) {
  const open = await db.tradeIdea.findMany({
    where: { status: 'pending', isPublic: true, symbol: { startsWith: 'XAU' } },
  })
  for (const idea of open) {
    const tps = (idea.takeProfits as TP[]) || []

    // Has price traded into the entry zone? Buy fills when price falls to the top
    // of the zone; sell fills when price rises to the bottom. No zone → treat as
    // an at-market entry (always considered filled). Latches on once true.
    const eLo = Math.min(idea.entryLow ?? NaN, idea.entryHigh ?? (idea.entryLow ?? NaN))
    const eHi = Math.max(idea.entryHigh ?? NaN, idea.entryLow ?? (idea.entryHigh ?? NaN))
    const hasZone = Number.isFinite(eLo) && Number.isFinite(eHi)
    const fillsNow = !hasZone || (idea.direction === 'buy' ? price <= eHi : price >= eLo)
    const entered = idea.entered || fillsNow

    // Persist the entry fill the first time we see it, even if no TP is reached yet.
    if (entered && !idea.entered) {
      await db.tradeIdea.update({ where: { id: idea.id }, data: { entered: true } })
    }
    // Not entered yet → the trade hasn't triggered, so no TP can be counted.
    if (!entered) continue

    const prevAnyHit = tps.some(t => t.hit)
    let changed = false
    const next = tps.map(t => {
      const reached = idea.direction === 'buy' ? price >= t.price : price <= t.price
      if (reached && !t.hit) { changed = true; return { ...t, hit: true } }
      return t
    })
    if (!changed) continue

    // Only fully close when EVERY TP is hit; otherwise keep it running (in profit).
    const allHit = next.length > 0 && next.every(t => t.hit)
    const nowAnyHit = next.some(t => t.hit)
    const newStatus = allHit ? 'tp_hit' : idea.status
    await db.tradeIdea.update({ where: { id: idea.id }, data: { takeProfits: next, status: newStatus } })

    if (allHit && idea.status !== 'tp_hit') {
      // Final target reached — celebrate with total pips.
      const pips = signalPips({
        symbol: idea.symbol, direction: idea.direction as 'buy' | 'sell',
        entryLow: idea.entryLow, entryHigh: idea.entryHigh, slLow: idea.slLow, slHigh: idea.slHigh,
        takeProfits: next, status: 'tp_hit',
      })
      await sendPushToAll({
        title: `🎯 All targets hit · ${idea.symbol}`,
        body: pips != null ? `+${pips} pips — full close! 🔥` : 'All targets hit — full close!',
        url: '/ideas', tag: `result-${idea.id}`,
      }, idea.authorId).catch(() => {})
    } else if (!prevAnyHit && nowAnyHit) {
      // First TP milestone — trade is secured, but keep it running for the rest.
      const n = next.filter(t => t.hit).length
      await sendPushToAll({
        title: `🎯 TP${n} hit · ${idea.symbol}`,
        body: 'In profit — consider moving your stop to breakeven. Running for the next targets.',
        url: '/ideas', tag: `milestone-${idea.id}`,
      }, idea.authorId).catch(() => {})
    }
  }
}

async function checkAlerts(price: number) {
  const alerts = await db.priceAlert.findMany({ where: { triggered: false, symbol: { startsWith: 'XAU' } } })
  const hit = alerts.filter(a => (a.direction === 'above' ? price >= a.targetPrice : price <= a.targetPrice))
  for (const a of hit) {
    await db.priceAlert.update({ where: { id: a.id }, data: { triggered: true } })
    await sendPushToUsers([a.userId], {
      title: `🔔 ${a.symbol} hit ${a.targetPrice}`,
      body: `Price is now ${price} (${a.direction} your alert).`,
      url: '/chart', tag: `alert-${a.id}`,
    }).catch(() => {})
  }
}
