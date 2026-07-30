// Shared trading math: pip config, position sizing, pips, and live signal status.
// Pure functions (no window/DOM) so both server routes and client can use them.

import { normalizeSymbol } from './symbols'

export interface PipConfig { pipSize: number; pipValue: number }

const CRYPTO_BASES = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'ADA', 'BNB', 'LTC']

/**
 * Gold (XAUUSD and friends). Pips are only comparable within one instrument
 * class, so aggregate "pips banked" totals are restricted to gold.
 */
export function isGold(symbol: string) {
  return normalizeSymbol(symbol).startsWith('XAU')
}

/**
 * Pip size + USD value per standard lot, inferred from the symbol.
 *
 * Normalises first: members type "GOLD" as often as "XAUUSD", and an
 * unrecognised symbol falls through to the points fallback below, which would
 * price gold at 1/100th of its real pip value.
 */
export function pipConfig(symbol: string): PipConfig {
  const s = normalizeSymbol(symbol)
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

export interface TradeMath {
  pips: number
  pnl: number
  /** Cash at risk between entry and stop. Null when no stop was recorded. */
  riskAmount: number | null
  /** Result in units of risk. Null when no stop was recorded (nothing to divide by). */
  r: number | null
}

/**
 * Realised P&L and R-multiple for a closed trade.
 *
 * R is the only unit that makes two trades comparable — a $100 win risking $20
 * (+5R) and a $100 win risking $200 (+0.5R) are the same number of dollars and
 * completely different trades. It needs a stop, so R is null without one.
 */
export function tradeMath(opts: {
  symbol: string
  direction: string
  entry: number
  exit: number
  stop?: number | null
  lots: number
}): TradeMath | null {
  const { symbol, direction, entry, exit, stop, lots } = opts
  if (![entry, exit, lots].every(Number.isFinite) || !(lots > 0)) return null

  const { pipSize, pipValue } = pipConfig(symbol)
  // A sell profits when price falls, so the move is measured entry→exit for a
  // buy and exit→entry for a sell.
  const move = direction === 'sell' ? entry - exit : exit - entry
  const pips = move / pipSize
  const pnl = pips * pipValue * lots

  if (stop == null || !Number.isFinite(stop)) {
    return { pips, pnl, riskAmount: null, r: null }
  }
  const riskAmount = (Math.abs(entry - stop) / pipSize) * pipValue * lots
  // A stop at the entry price risks nothing on paper — R is undefined, not ∞.
  if (!(riskAmount > 0)) return { pips, pnl, riskAmount: null, r: null }
  return { pips, pnl, riskAmount, r: pnl / riskAmount }
}

/**
 * Signed pips on a closed trade, from the prices alone. Lot size doesn't move
 * the pip count, so this reads entries that never recorded a size — unlike
 * tradeMath, which needs lots to reach a cash figure.
 *
 * Null on points instruments (crypto, indices): a 1-point index move and a
 * 0.0001 FX pip are different units, and a total that mixes them means nothing.
 */
export function tradePips(opts: {
  symbol: string; direction: string; entry: number; exit: number
}): number | null {
  const { symbol, direction, entry, exit } = opts
  if (![entry, exit].every(Number.isFinite)) return null
  const { pipSize } = pipConfig(symbol)
  if (pipSize === 1) return null
  const move = direction === 'sell' ? entry - exit : exit - entry
  return move / pipSize
}

export interface Idea {
  symbol: string
  direction: 'buy' | 'sell'
  entryLow: number | null; entryHigh: number | null
  slLow: number | null; slHigh: number | null
  takeProfits: { price: number; pips?: number | null; hit?: boolean }[]
  status: 'pending' | 'running' | 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled'
}

/**
 * The take-profit that makes a closed signal a win outright (0-based, so
 * 1 = TP2). House rule: reaching TP2 is a win, full stop.
 */
export const WIN_TP_INDEX = 1

/**
 * How far TP1 has to sit from entry for a TP1-only close to still be a win.
 * A trade that stalls at the first target is only worth banking if that target
 * was a real move — under this, it goes down as a loss. Strictly greater than.
 */
export const TP1_WIN_MIN_PIPS = 20

export type SignalOutcome = 'open' | 'win' | 'loss' | 'neutral'

/** Deepest take-profit marked hit, 0-based. -1 when none are ticked. */
export function deepestTpHit(takeProfits: { hit?: boolean }[]): number {
  return takeProfits.reduce((deepest, tp, i) => (tp.hit ? i : deepest), -1)
}

/** Distance from entry to a price, in this symbol's pips (points on crypto/indices). */
function pipsFromEntry(idea: OutcomeIdea, price: number): number | null {
  const entry = mid(idea.entryLow, idea.entryHigh)
  if (entry == null || !Number.isFinite(price)) return null
  return Math.abs(price - entry) / pipConfig(idea.symbol).pipSize
}

export interface OutcomeIdea {
  status: string
  symbol: string
  entryLow: number | null
  entryHigh: number | null
  takeProfits?: { price?: number; hit?: boolean }[] | null
}

/**
 * Does this signal move win-rate, and which way?
 *
 * SL hit is a loss and pending/running/breakeven/closed/cancelled are neutral,
 * as before. For a TP close, what counts is how far it actually ran:
 *  - TP2 or deeper ticked → win
 *  - TP1 only, more than TP1_WIN_MIN_PIPS from entry → win
 *  - TP1 only, at or under that → loss (the move was too small to bank)
 *  - nothing ticked → win, i.e. we trust the coach's explicit TP-hit close
 *    rather than inventing a loss from missing data
 *  - TP1 only but no entry/TP price to measure → falls back to the TP2 rule:
 *    a win if TP1 was the signal's only target, a loss otherwise.
 */
export function signalOutcome(idea: OutcomeIdea): SignalOutcome {
  if (idea.status === 'pending' || idea.status === 'running') return 'open'
  if (idea.status === 'sl_hit') return 'loss'
  if (idea.status !== 'tp_hit') return 'neutral'
  const tps = idea.takeProfits ?? []
  const deepest = deepestTpHit(tps)
  if (deepest < 0) return 'win'
  if (deepest >= WIN_TP_INDEX) return 'win'
  const pips = pipsFromEntry(idea, tps[0]?.price ?? NaN)
  if (pips == null) return tps.length > WIN_TP_INDEX ? 'loss' : 'win'
  return pips > TP1_WIN_MIN_PIPS ? 'win' : 'loss'
}

export type StatusKey = 'valid' | 'zone' | 'missed' | 'tp' | 'tp1' | 'sl' | 'be' | 'closed' | 'cancelled'
export interface LiveStatus { key: StatusKey; label: string; tone: 'green' | 'amber' | 'red' | 'slate' | 'void'; dot: string }

/** Where the current price sits relative to the entry zone. */
export function liveSignalStatus(idea: Idea, price: number | null): LiveStatus | null {
  if (idea.status === 'tp_hit') {
    // A TP close that stopped short at TP1 reads as a loss, so say so on the card
    // instead of showing a green "TP hit" the stats then contradict.
    return signalOutcome(idea) === 'win'
      ? { key: 'tp', label: 'TP hit', tone: 'green', dot: '✅' }
      : { key: 'tp1', label: 'TP1 only · counts as loss', tone: 'red', dot: '🟠' }
  }
  if (idea.status === 'sl_hit') return { key: 'sl', label: 'SL hit', tone: 'red', dot: '🔴' }
  if (idea.status === 'breakeven') return { key: 'be', label: 'Breakeven', tone: 'amber', dot: '⚪' }
  if (idea.status === 'closed') return { key: 'closed', label: 'Closed manually', tone: 'slate', dot: '⚫' }
  if (idea.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled (no trade)', tone: 'void', dot: '🚫' }
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
