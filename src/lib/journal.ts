import { tradeMath } from './trading'

// Normalise a journal entry's P&L so its sign always agrees with the
// win/loss result the trader selected. The P&L input is entered as a raw
// number; a trader logging a loss naturally types the magnitude (e.g. "80")
// without a minus sign, which would otherwise be stored — and shown — as a
// profit. When a result is chosen we treat the number as a magnitude and let
// the result decide the sign:
//   - loss  -> negative
//   - win   -> positive
//   - breakeven / no result -> keep the sign as entered
//
// Only used for hand-typed P&L. When the trade's prices are recorded the sign
// comes from the math instead — see deriveTrade.
export function normalizePnl(pnl: unknown, result: unknown): number | null {
  if (pnl === '' || pnl == null) return null
  const n = Number(pnl)
  if (Number.isNaN(n)) return null
  if (result === 'loss') return -Math.abs(n)
  if (result === 'win') return Math.abs(n)
  return n
}

/** Parse a form value that may be '', null, or a numeric string. */
export function numOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export interface TradeFields {
  symbol?: unknown
  direction?: unknown
  entryPrice?: unknown
  exitPrice?: unknown
  stopPrice?: unknown
  targetPrice?: unknown
  lots?: unknown
  pnl?: unknown
  result?: unknown
}

export interface DerivedTrade {
  entryPrice: number | null
  exitPrice: number | null
  stopPrice: number | null
  targetPrice: number | null
  lots: number | null
  pnl: number | null
  rMultiple: number | null
  /** True when pnl came from the prices rather than the trader's keyboard. */
  derived: boolean
}

/**
 * Work out what to store for a journal entry's trade numbers.
 *
 * When symbol, direction, entry, exit and lots are all present we compute P&L
 * and R from the prices — that's the authoritative answer, and it ignores any
 * hand-typed P&L, which is what stops a bad day from being quietly rounded up.
 * Anything less (a quick note, a legacy entry) falls back to the typed P&L, and
 * R stays null: without a stop there's nothing to measure the result against.
 */
export function deriveTrade(input: TradeFields): DerivedTrade {
  const entryPrice = numOrNull(input.entryPrice)
  const exitPrice = numOrNull(input.exitPrice)
  const stopPrice = numOrNull(input.stopPrice)
  const targetPrice = numOrNull(input.targetPrice)
  const lots = numOrNull(input.lots)
  const symbol = typeof input.symbol === 'string' ? input.symbol : ''
  const direction = typeof input.direction === 'string' ? input.direction : ''

  const prices = { entryPrice, exitPrice, stopPrice, targetPrice, lots }

  if (symbol && direction && entryPrice != null && exitPrice != null && lots != null) {
    const m = tradeMath({ symbol, direction, entry: entryPrice, exit: exitPrice, stop: stopPrice, lots })
    if (m) {
      return {
        ...prices,
        pnl: Math.round(m.pnl * 100) / 100,
        rMultiple: m.r == null ? null : Math.round(m.r * 100) / 100,
        derived: true,
      }
    }
  }

  return {
    ...prices,
    pnl: normalizePnl(input.pnl, input.result),
    rMultiple: null,
    derived: false,
  }
}
