import { NextResponse, after } from 'next/server'
import { runGoldPriceEvents } from '@/lib/priceEvents'

// Live spot price proxy — used for the "is this signal still enterable?" status.
// Currently supports gold (XAUUSD/XAU); other symbols return null. Cached ~30s
// server-side so we hit the upstream at most a couple times a minute.
export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get('symbol') || 'XAUUSD').toUpperCase()

  if (!symbol.startsWith('XAU')) {
    return NextResponse.json({ symbol, price: null })
  }

  try {
    const res = await fetch('https://api.gold-api.com/price/XAU', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    })
    const data = await res.json()
    const price = data?.price
    if (typeof price === 'number' && price > 0) {
      const rounded = Math.round(price * 100) / 100
      after(() => runGoldPriceEvents(rounded)) // auto-close + price alerts (throttled)
      return NextResponse.json({ symbol, price: rounded })
    }
  } catch {
    // fall through
  }
  return NextResponse.json({ symbol, price: null })
}
