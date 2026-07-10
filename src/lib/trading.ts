// Shared trading math: pip config, position sizing, pips, and live signal status.
// Pure functions (no window/DOM) so both server routes and client can use them.

export interface PipConfig { pipSize: number; pipValue: number }

const CRYPTO_BASES = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'ADA', 'BNB', 'LTC']

/**
 * Gold (XAUUSD and friends). Pips are only comparable within one instrument
 * class, so aggregate "pips banked" totals are restricted to gold.
 */
export function isGold(symbol: string) {
  return (symbol || '').toUpperCase().startsWith('XAU')
}

/** Pip size + USD value per standard lot, inferred from the symbol. */
export function pipConfig(symbol: string): PipConfig {
  const s = (symbol || '').toUpperCase()
  if (s.startsWith('XAU')) return { pipSize: 0.1, pipValue: 10 }   // gold
  if (s.startsWith('XAG')) return { pipSize: 0.01, pipValue: 50 }  // silver
  if (s.includes('JPY')) return { pipSize: 0.01, pipValue: 9.1 }   // JPY pairs
  // Crypto must be checked before the FX regex: ETHUSD/BTCUSD are six letters
  // ending in USD and would otherwise be priced as forex majors.
  if (CRYPTO_BASES.some(b => s.startsWith(b))) return { pipSize: 1, pipValue: 1 } // crypto (points)
  if (/^[A-Z]{3}(USD|EUR|GBP|CHF|CAD|AUD|NZD)$/.test(s) || /^(EUR|GBP|USD|AUD|NZD|CAD|CHF)[A-Z]{3}$/.test(s))
    return { pipSize: 0.0001, pipValue: 10 }                        // FX majors
  return { pipSize: 1, pipValue: 1 }                                // indices / fallback (points)
}

/** What one unit of movement is called on this symbol. */
export function pipUnit(symbol: string): 'pips' | 'points' {
  return pipConfig(symbol).pipSize === 1 ? 'points' : 'pips'
}

export const mid = (lo: number | null | undefined, hi: number | null | undefined): number | null => {
  if (lo != null && hi != null) return (lo + hi) / 2
  return lo ?? hi ?? null
}

/** Lot size for a given account, risk %, and entry/stop from a signal. */
export function positionSize(opts: {
  balance: number; riskPct: number; entry: number; sl: number; symbol: string
}): { lots: number; stopPips: number; riskAmount: number } | null {
  const { balance, riskPct, entry, sl, symbol } = opts
  if (!(balance > 0) || !(riskPct > 0) || !Number.isFinite(entry) || !Number.isFinite(sl)) return null
  const { pipSize, pipValue } = pipConfig(symbol)
  const stopPips = Math.abs(entry - sl) / pipSize
  if (!(stopPips > 0)) return null
  const riskAmount = balance * (riskPct / 100)
  const lots = riskAmount / (stopPips * pipValue)
  return { lots, stopPips, riskAmount }
}

export interface Idea {
  symbol: string
  direction: 'buy' | 'sell'
  entryLow: number | null; entryHigh: number | null
  slLow: number | null; slHigh: number | null
  takeProfits: { price: number; pips?: number | null; hit?: boolean }[]
  status: 'pending' | 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled'
}

export type StatusKey = 'valid' | 'zone' | 'missed' | 'tp' | 'sl' | 'be' | 'closed' | 'cancelled'
export interface LiveStatus { key: StatusKey; label: string; tone: 'green' | 'amber' | 'red' | 'slate'; dot: string }

/** Where the current price sits relative to the entry zone. */
export function liveSignalStatus(idea: Idea, price: number | null): LiveStatus | null {
  if (idea.status === 'tp_hit') return { key: 'tp', label: 'TP hit', tone: 'green', dot: '✅' }
  if (idea.status === 'sl_hit') return { key: 'sl', label: 'SL hit', tone: 'red', dot: '🔴' }
  if (idea.status === 'breakeven') return { key: 'be', label: 'Breakeven', tone: 'amber', dot: '⚪' }
  if (idea.status === 'closed') return { key: 'closed', label: 'Closed manually', tone: 'slate', dot: '⚫' }
  if (idea.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled', tone: 'slate', dot: '🚫' }
  if (price == null) return null
  const eLo = Math.min(idea.entryLow ?? NaN, idea.entryHigh ?? (idea.entryLow ?? NaN))
  const eHi = Math.max(idea.entryHigh ?? NaN, idea.entryLow ?? (idea.entryHigh ?? NaN))
  if (!Number.isFinite(eLo) || !Number.isFinite(eHi)) return null
  if (price >= eLo && price <= eHi) return { key: 'zone', label: 'Price in zone', tone: 'amber', dot: '🟡' }
  const valid = idea.direction === 'buy' ? price < eLo : price > eHi
  return valid
    ? { key: 'valid', label: 'Entry valid', tone: 'green', dot: '🟢' }
    : { key: 'missed', label: 'Missed (running)', tone: 'red', dot: '🔴' }
}

/** Realised pips for a closed signal: positive on TP, negative on SL. Null if open/uncomputable. */
export function signalPips(idea: Idea): number | null {
  const entry = mid(idea.entryLow, idea.entryHigh)
  if (entry == null) return null
  const { pipSize } = pipConfig(idea.symbol)
  if (idea.status === 'tp_hit') {
    const hit = idea.takeProfits.filter(t => t.hit).map(t => t.price)
    const prices = hit.length ? hit : idea.takeProfits.map(t => t.price).slice(0, 1)
    if (!prices.length) return null
    const target = idea.direction === 'buy' ? Math.max(...prices) : Math.min(...prices)
    return Math.round(Math.abs(target - entry) / pipSize)
  }
  if (idea.status === 'sl_hit') {
    const sl = mid(idea.slLow, idea.slHigh)
    if (sl == null) return null
    return -Math.round(Math.abs(entry - sl) / pipSize)
  }
  return null
}
