import { db } from './db'
import { sendPushToUsers } from './push'

let lastRun = 0

// Run gold-price-driven side effects. Signals are closed manually by their author
// (via the quick-close buttons or the edit form) for every symbol — gold included —
// so we no longer auto-close them off the live feed. What remains here is firing any
// user price alerts that the latest gold price has crossed. Throttled so a burst of
// client price polls doesn't re-run it. Piggybacks on the /api/price route (no cron
// needed).
export async function runGoldPriceEvents(price: number) {
  const now = Date.now()
  if (now - lastRun < 40000) return
  lastRun = now
  await checkAlerts(price)
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
