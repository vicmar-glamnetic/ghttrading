// Normalise a journal entry's P&L so its sign always agrees with the
// win/loss result the trader selected. The P&L input is entered as a raw
// number; a trader logging a loss naturally types the magnitude (e.g. "80")
// without a minus sign, which would otherwise be stored — and shown — as a
// profit. When a result is chosen we treat the number as a magnitude and let
// the result decide the sign:
//   - loss  -> negative
//   - win   -> positive
//   - breakeven / no result -> keep the sign as entered
export function normalizePnl(pnl: unknown, result: unknown): number | null {
  if (pnl === '' || pnl == null) return null
  const n = Number(pnl)
  if (Number.isNaN(n)) return null
  if (result === 'loss') return -Math.abs(n)
  if (result === 'win') return Math.abs(n)
  return n
}
