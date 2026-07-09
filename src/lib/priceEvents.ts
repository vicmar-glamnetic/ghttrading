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

// Mark TPs that price has reached and close the signal as tp_hit (TP-only: a TP
// beyond entry means the trade was entered, so this can't produce false wins).
async function autoCloseGold(price: number) {
  const open = await db.tradeIdea.findMany({
    where: { status: 'pending', isPublic: true, symbol: { startsWith: 'XAU' } },
  })
  for (const idea of open) {
    const tps = (idea.takeProfits as TP[]) || []
    let changed = false
    const next = tps.map(t => {
      const reached = idea.direction === 'buy' ? price >= t.price : price <= t.price
      if (reached && !t.hit) { changed = true; return { ...t, hit: true } }
      return t
    })
    if (!changed) continue
    const nowTpHit = next.some(t => t.hit)
    const newStatus = nowTpHit ? 'tp_hit' : idea.status
    await db.tradeIdea.update({ where: { id: idea.id }, data: { takeProfits: next, status: newStatus } })

    if (newStatus === 'tp_hit' && idea.status !== 'tp_hit') {
      const pips = signalPips({
        symbol: idea.symbol, direction: idea.direction as 'buy' | 'sell',
        entryLow: idea.entryLow, entryHigh: idea.entryHigh, slLow: idea.slLow, slHigh: idea.slHigh,
        takeProfits: next, status: 'tp_hit',
      })
      await sendPushToAll({
        title: `🎯 TP hit · ${idea.symbol}`,
        body: pips != null ? `+${pips} pips — auto-closed at target.` : 'Target reached.',
        url: '/ideas', tag: `result-${idea.id}`,
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
