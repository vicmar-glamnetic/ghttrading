// Symbol handling: what members type vs. what the pip math and the price feed
// need.
//
// Members type the symbol by hand into the journal, so the field holds things
// like "GOLD" and "gold" alongside "XAUUSD". That matters beyond cosmetics:
// pipConfig() keys off the symbol, and an unrecognised one silently falls back
// to points (pipSize 1, pipValue 1), which makes a derived gold P&L wrong by
// ~100x. Normalise before doing anything numeric with a symbol.

/** Aliases members actually type, mapped to the canonical instrument. */
const ALIASES: Record<string, string> = {
  GOLD: 'XAUUSD',
  XAU: 'XAUUSD',
  XAUUSDT: 'XAUUSD',
  SILVER: 'XAGUSD',
  XAG: 'XAGUSD',
  BITCOIN: 'BTCUSD',
  BTC: 'BTCUSD',
  BTCUSDT: 'BTCUSD',
  ETHEREUM: 'ETHUSD',
  ETH: 'ETHUSD',
  ETHUSDT: 'ETHUSD',
  PLATINUM: 'XPTUSD',
  XPT: 'XPTUSD',
  PALLADIUM: 'XPDUSD',
  XPD: 'XPDUSD',
  COPPER: 'HGUSD',
  HG: 'HGUSD',
}

/**
 * Canonical form of a symbol a member typed. Uppercases, strips separators
 * ("XAU/USD", "xau-usd" → "XAUUSD"), and resolves known aliases. Unknown input
 * is returned uppercased and cleaned rather than rejected — the journal's symbol
 * field is free text and a note like "50-100$ A DAY" must still save.
 */
export function normalizeSymbol(input: string | null | undefined): string {
  if (!input) return ''
  const cleaned = input.trim().toUpperCase().replace(/[\s/_-]/g, '')
  return ALIASES[cleaned] ?? cleaned
}

// What our upstream price feed (api.gold-api.com) calls each instrument. It
// covers metals + the two major cryptos and needs no API key; it has no forex.
// Keys are canonical symbols (post-normalizeSymbol).
const PRICE_ASSETS: Record<string, string> = {
  XAUUSD: 'XAU',
  XAGUSD: 'XAG',
  BTCUSD: 'BTC',
  ETHUSD: 'ETH',
  XPTUSD: 'XPT',
  XPDUSD: 'XPD',
  HGUSD: 'HG',
}

/** Upstream asset code for a symbol, or null if we can't price it live. */
export function priceAsset(symbol: string | null | undefined): string | null {
  return PRICE_ASSETS[normalizeSymbol(symbol)] ?? null
}

/** Whether we can fetch a live price for this symbol at all. */
export function isPriceable(symbol: string | null | undefined): boolean {
  return priceAsset(symbol) != null
}

/** Every symbol we can price — used to scope the alert sweep. */
export const PRICEABLE_SYMBOLS = Object.keys(PRICE_ASSETS)
