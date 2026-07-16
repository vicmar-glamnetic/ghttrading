import { NextResponse, after } from 'next/server'
import { runPriceEvents } from '@/lib/priceEvents'
import { normalizeSymbol, priceAsset } from '@/lib/symbols'

// Live spot price proxy — drives the "is this signal still enterable?" status,
// zone alerts and price alerts.
//
// Upstream (api.gold-api.com) is free and keyless and covers metals + BTC/ETH,
// which is every symbol our coaches actually post. It has no forex: those come
// back supported:false so the client can say why rather than render a card whose
// status is silently missing.
//
// Two shapes:
//   ?symbol=XAUUSD             -> { symbol, price, supported }
//   ?symbols=XAUUSD,BTCUSD     -> { prices: { XAUUSD: 4110.2, BTCUSD: null }, unsupported: [] }
// The batch form exists because the board polls every 2s: one request per symbol
// would multiply function invocations by the number of instruments on screen.
//
// Each upstream fetch is cached ~2s server-side (Next dedupes across all users).

const MAX_BATCH = 8

async function quote(symbol: string): Promise<{ price: number | null; supported: boolean }> {
  const asset = priceAsset(symbol)
  if (!asset) return { price: null, supported: false }
  try {
    const res = await fetch(`https://api.gold-api.com/price/${asset}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 2 },
    })
    const data = await res.json()
    const price = data?.price
    if (typeof price === 'number' && price > 0) {
      return { price: Math.round(price * 100) / 100, supported: true }
    }
  } catch {
    // fall through
  }
  return { price: null, supported: true }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const batch = params.get('symbols')

  if (batch) {
    const symbols = [...new Set(batch.split(',').map(normalizeSymbol).filter(Boolean))].slice(0, MAX_BATCH)
    const results = await Promise.all(symbols.map(async s => [s, await quote(s)] as const))

    const prices: Record<string, number | null> = {}
    const unsupported: string[] = []
    for (const [s, q] of results) {
      prices[s] = q.price
      if (!q.supported) unsupported.push(s)
      if (q.price != null) after(() => runPriceEvents(s, q.price!))
    }
    return NextResponse.json({ prices, unsupported })
  }

  const symbol = normalizeSymbol(params.get('symbol') || 'XAUUSD')
  const q = await quote(symbol)
  if (q.price != null) after(() => runPriceEvents(symbol, q.price!))
  return NextResponse.json({ symbol, price: q.price, supported: q.supported })
}
