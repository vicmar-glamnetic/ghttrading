'use client'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeProvider'

// Ambient market-pulse strip (TradingView ticker tape) — full width under the navbar.
export function TickerTape() {
  const { resolved } = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    s.async = true
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'OANDA:XAUUSD', title: 'Gold' },
        { proName: 'FX:EURUSD', title: 'EUR/USD' },
        { proName: 'FX:GBPUSD', title: 'GBP/USD' },
        { proName: 'OANDA:USDJPY', title: 'USD/JPY' },
        { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
        { proName: 'NASDAQ:NDX', title: 'US100' },
        { proName: 'TVC:DXY', title: 'DXY' },
      ],
      colorTheme: resolved,
      isTransparent: true,
      displayMode: 'compact',
      locale: 'en',
    })
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [resolved])

  return <div key={resolved} ref={ref} className="border-b border-line bg-surface" />
}
