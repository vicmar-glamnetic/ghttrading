/**
 * Shorthand signal parser — turns what a coach types in the groups into the
 * structured fields the app stores.
 *
 * Shared by the browser (the composer parses as you type, to preview what the
 * rooms will receive) and the server (which re-parses on submit rather than
 * trusting numbers the client sent). Deliberately free of server-only imports.
 */

/* ---------- shorthand signal parser ----------
   Handles both the freeform shorthand:
     Buy now 4110-4105 buy more 4098 4001
     4115
     Sl 4088
   and the labeled format:
     🚨XAUUSD SELL LIMIT🚨
     EP: 4125
     Sl: 4117
     Tp1: 4120
     Tp2: 4115
   → { symbol, direction, entry range, stop-loss, take-profits, extra "buy more" levels }. */
/**
 * What a signal is assumed to be about when the text never names an instrument.
 * The desk trades gold, and coaches rarely write "XAUUSD" above a price list —
 * so an unlabelled signal is a gold signal.
 */
export const DEFAULT_SYMBOL = 'XAUUSD'

export const numsIn = (s: string) => (s.match(/\d+(?:\.\d+)?/g) || []).map(Number)
// Common instrument tickers (won't match plain words like "SIGNAL"/"LIMIT").
const SYMBOL_RE = /\b(XAU[A-Z]{2,3}|XAG[A-Z]{2,3}|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|XAU|XAG)(?:USD|JPY|EUR|GBP|CHF|CAD|AUD|NZD)|BTC[A-Z]{0,4}|ETH[A-Z]{0,4}|US30|US500|NAS100|GER40|UK100|SPX500)\b/

export function parseSignal(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let direction: 'buy' | 'sell' | null = null
  let symbol: string | null = null
  const entries: number[] = []
  const more: number[] = []
  const tps: number[] = []
  const sls: number[] = []

  for (const line of lines) {
    const low = line.toLowerCase()

    // Skip disclaimer / noise lines.
    if (/disclaimer|financial advice|risk manage/.test(low)) continue

    // Symbol (from a header line), detected once.
    if (!symbol) {
      const m = line.toUpperCase().replace(/[^A-Z0-9/ ]/g, ' ').match(SYMBOL_RE)
      if (m) symbol = m[1]
    }

    // Direction — any line mentioning buy/sell.
    if (/\bsell\b/.test(low)) direction = 'sell'
    else if (/\bbuy\b/.test(low)) direction = direction ?? 'buy'

    // Take profit: "tp", "tp1", "take profit N", "target" (label number ignored).
    const tp = low.match(/\b(?:tp|take\s*profit|target)\s*\d*\s*[:=.\-]?\s*(.+)$/)
    if (tp) { const v = numsIn(tp[1]); if (v.length) { tps.push(...v); continue } }

    // Stop loss: "sl", "s/l", "stop loss".
    const sl = low.match(/\b(?:sl|s\/l|stop\s*loss)\s*[:=.\-]?\s*(.+)$/)
    if (sl) { const v = numsIn(sl[1]); if (v.length) { sls.push(...v); continue } }

    // Entry: "ep", "entry", "entry price".
    const ep = low.match(/\b(?:ep|entry\s*price|entry)\s*[:=.\-]?\s*(.+)$/)
    if (ep) { const v = numsIn(ep[1]); if (v.length) { entries.push(...v); continue } }

    // A number immediately followed by an emoji is an explicit take-profit.
    const emojiTps = [...line.matchAll(/(\d+(?:\.\d+)?)\s*\p{Extended_Pictographic}/gu)].map(m => Number(m[1]))
    if (emojiTps.length) { tps.push(...emojiTps); continue }

    // Freeform entry / "buy more" line.
    if (/buy|sell|entry|now|more/.test(low)) {
      const moreIdx = low.indexOf('more')
      if (moreIdx >= 0) {
        numsIn(line.slice(0, moreIdx)).forEach(n => entries.push(n))
        numsIn(line.slice(moreIdx)).forEach(n => more.push(n))
      } else {
        entries.push(...numsIn(line))
      }
      continue
    }

    // Otherwise a bare price line → take profit.
    const bare = numsIn(line)
    if (bare.length) tps.push(...bare)
  }

  const entryLow = entries.length ? Math.min(...entries) : null
  const entryHigh = entries.length ? Math.max(...entries) : null
  const slLow = sls.length ? Math.min(...sls) : null
  const slHigh = sls.length ? Math.max(...sls) : null

  return { symbol, direction, entryLow, entryHigh, slLow, slHigh, takeProfits: tps, moreEntries: more }
}
