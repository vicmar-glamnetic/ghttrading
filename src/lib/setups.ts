// The community's shared vocabulary for trade setups.
//
// This list is deliberately fixed and small. Every member tags entries from the
// same options, which is what lets the analytics compare setups across traders
// ("Liquidity Sweep loses money for everyone on Fridays") instead of drowning in
// per-member spellings of the same idea.
//
// Editing: add/rename freely, but never reuse or repurpose an existing `value` —
// it's what's stored on the entry, so a repurposed value silently rewrites
// history. Retire a setup by removing it here; old entries keep their value and
// fall back to showing the raw string.

export interface Setup {
  value: string
  label: string
}

export const SETUPS: Setup[] = [
  { value: 'london-breakout',    label: 'London Breakout' },
  { value: 'ny-session',         label: 'New York Session' },
  { value: 'liquidity-sweep',    label: 'Liquidity Sweep' },
  { value: 'order-block',        label: 'Order Block' },
  { value: 'fair-value-gap',     label: 'Fair Value Gap' },
  { value: 'break-of-structure', label: 'Break of Structure' },
  { value: 'break-retest',       label: 'Break & Retest' },
  { value: 'trend-continuation', label: 'Trend Continuation' },
  { value: 'range-reversal',     label: 'Range Reversal' },
  { value: 'sr-bounce',          label: 'Support / Resistance Bounce' },
  { value: 'news-reaction',      label: 'News Reaction' },
  { value: 'coach-signal',       label: 'Coach Signal' },
  { value: 'other',              label: 'Other' },
]

const BY_VALUE = new Map(SETUPS.map(s => [s.value, s]))

/** Display name for a stored setup value. Retired/unknown values show as-is. */
export function setupLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return BY_VALUE.get(value)?.label ?? value
}

/** Whether a value is one we currently offer (used to reject junk on write). */
export function isKnownSetup(value: unknown): value is string {
  return typeof value === 'string' && BY_VALUE.has(value)
}
