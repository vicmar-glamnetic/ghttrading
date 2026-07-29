// The community's shared vocabulary for trade setups.
//
// Every member tags entries from the same options, which is what lets the
// analytics compare setups across traders ("Liquidity Sweep loses money for
// everyone on Fridays") instead of drowning in per-member spellings of the same
// idea. An entry can carry several of these at once — a real trade is often a
// confluence (a sweep into an order block inside a discount), and each tagged
// setup is counted on its own in the analytics.
//
// Storage: the tags are kept as a single comma-joined string of `value`s on the
// entry (e.g. "liquidity-sweep,order-block"). A legacy single value has no comma
// and still parses as a one-item list, so old entries keep working untouched.
//
// Editing: add/rename freely, but never reuse or repurpose an existing `value` —
// it's what's stored on the entry, so a repurposed value silently rewrites
// history. `value`s must never contain a comma (it's the separator). Retire a
// setup by removing it here; old entries keep their value and fall back to
// showing the raw string.

export interface Setup {
  value: string
  label: string
  /**
   * Extra terms the picker's search box matches on, for the abbreviations
   * traders actually type ("fvg", "ob", "choch"). Never stored — display and
   * storage still go through `label` / `value`.
   */
  keywords?: string[]
}

export const SETUPS: Setup[] = [
  // Sessions & timing
  { value: 'asian-range',           label: 'Asian Range',                    keywords: ['asia', 'tokyo'] },
  { value: 'london-breakout',       label: 'London Breakout',                keywords: ['lo'] },
  { value: 'ny-session',            label: 'New York Session',               keywords: ['ny'] },
  { value: 'silver-bullet',         label: 'Silver Bullet',                  keywords: ['sb'] },
  { value: 'power-of-three',        label: 'Power of Three (AMD)',           keywords: ['amd', 'po3'] },
  // Smart-money / structure
  { value: 'liquidity-sweep',       label: 'Liquidity Sweep',                keywords: ['stop hunt', 'liq'] },
  { value: 'turtle-soup',           label: 'Turtle Soup' },
  { value: 'equal-highs-lows',      label: 'Equal Highs / Lows',             keywords: ['eqh', 'eql'] },
  { value: 'order-block',           label: 'Order Block',                    keywords: ['ob'] },
  { value: 'breaker-block',         label: 'Breaker Block',                  keywords: ['bb'] },
  { value: 'mitigation-block',      label: 'Mitigation Block',               keywords: ['mb'] },
  { value: 'fair-value-gap',        label: 'Fair Value Gap',                 keywords: ['fvg', 'imbalance'] },
  { value: 'break-of-structure',    label: 'Break of Structure',             keywords: ['bos'] },
  { value: 'change-of-character',   label: 'Change of Character (CHoCH)',    keywords: ['choch'] },
  { value: 'market-structure-shift',label: 'Market Structure Shift',         keywords: ['mss'] },
  { value: 'premium-discount',      label: 'Premium / Discount (OTE)',       keywords: ['ote'] },
  { value: 'supply-demand',         label: 'Supply / Demand Zone',           keywords: ['sd zone'] },
  // Classic price action
  { value: 'break-retest',          label: 'Break & Retest' },
  { value: 'trend-continuation',    label: 'Trend Continuation' },
  { value: 'range-reversal',        label: 'Range Reversal' },
  { value: 'sr-bounce',             label: 'Support / Resistance Bounce',    keywords: ['sr'] },
  { value: 'trendline-break',       label: 'Trendline Break' },
  { value: 'double-top-bottom',     label: 'Double Top / Bottom' },
  { value: 'head-shoulders',        label: 'Head & Shoulders' },
  { value: 'fibonacci',             label: 'Fibonacci Retracement',          keywords: ['fib'] },
  { value: 'ma-bounce',             label: 'Moving Average Bounce',          keywords: ['ma', 'ema', 'sma'] },
  { value: 'vwap-reversion',        label: 'VWAP Reversion' },
  { value: 'pin-bar',               label: 'Pin Bar / Rejection',            keywords: ['wick'] },
  { value: 'engulfing',             label: 'Engulfing Candle' },
  { value: 'inside-bar',            label: 'Inside Bar Breakout' },
  { value: 'gap-fill',              label: 'Gap Fill' },
  { value: 'scalp',                 label: 'Scalp' },
  // Catch-alls
  { value: 'news-reaction',         label: 'News Reaction',                  keywords: ['nfp', 'cpi', 'fomc'] },
  { value: 'coach-signal',          label: 'Coach Signal' },
  { value: 'other',                 label: 'Other' },
]

const BY_VALUE = new Map(SETUPS.map(s => [s.value, s]))

/**
 * The list as a human wants to read it: A–Z by label, with the "Other"
 * catch-all pinned last so it doesn't hide in the middle of the alphabet.
 * Pickers render this; `SETUPS` keeps its grouped order as the readable source
 * of truth for whoever edits the vocabulary.
 */
export const SETUPS_AZ: Setup[] = [...SETUPS].sort((a, b) => {
  if (a.value === 'other') return 1
  if (b.value === 'other') return -1
  return a.label.localeCompare(b.label, 'en')
})

/**
 * Does this setup match what someone typed into the picker's search box?
 * Matches the label, the stored value and the abbreviation keywords, so both
 * "fair value" and "fvg" find Fair Value Gap.
 */
export function setupMatches(setup: Setup, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (setup.label.toLowerCase().includes(q)) return true
  if (setup.value.includes(q.replace(/\s+/g, '-'))) return true
  return (setup.keywords ?? []).some(k => k.includes(q))
}

/** Display name for a single stored setup value. Unknown values show as-is. */
export function setupLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return BY_VALUE.get(value)?.label ?? value
}

/** Whether a value is one we currently offer (used to reject junk on write). */
export function isKnownSetup(value: unknown): value is string {
  return typeof value === 'string' && BY_VALUE.has(value)
}

/**
 * Split a stored setup value into its individual tags. Handles both the
 * comma-joined multi-setup form and legacy single values, dropping blanks.
 */
export function parseSetups(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

/** Display labels for a stored setup value — one per tagged setup, in order. */
export function setupLabels(value: string | null | undefined): string[] {
  return parseSetups(value).map(v => BY_VALUE.get(v)?.label ?? v)
}

/**
 * Normalise a client-supplied selection (an array of values, or a comma-joined
 * string) into the stored form: known values only, de-duplicated, order
 * preserved, comma-joined — or null when nothing valid remains.
 */
export function sanitizeSetups(input: unknown): string | null {
  const raw = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []
  const seen = new Set<string>()
  for (const item of raw) {
    const v = typeof item === 'string' ? item.trim() : ''
    if (BY_VALUE.has(v)) seen.add(v)
  }
  return seen.size ? [...seen].join(',') : null
}
