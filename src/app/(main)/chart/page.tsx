'use client'
import { useState, useEffect, useRef } from 'react'
import { LineChart, Search } from 'lucide-react'

// Quick-access symbols (TradingView symbol notation)
const PRESETS = [
  { label: 'Gold', symbol: 'OANDA:XAUUSD' },
  { label: 'BTC', symbol: 'BINANCE:BTCUSDT' },
  { label: 'Apple', symbol: 'NASDAQ:AAPL' },
  { label: 'EUR/USD', symbol: 'FX:EURUSD' },
  { label: 'US100', symbol: 'NASDAQ:NDX' },
  { label: 'Oil', symbol: 'TVC:USOIL' },
]

function TradingViewChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = container.current
    if (!el) return
    el.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(13, 13, 20, 1)',
      gridColor: 'rgba(42, 42, 58, 0.5)',
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      support_host: 'https://www.tradingview.com',
    })
    el.appendChild(script)
    return () => { el.innerHTML = '' }
  }, [symbol])

  // key forces a fresh container per symbol so the widget fully re-initialises
  return <div key={symbol} ref={container} className="tradingview-widget-container h-full w-full" />
}

export default function ChartPage() {
  const [symbol, setSymbol] = useState(PRESETS[0].symbol)
  const [query, setQuery] = useState('')

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim().toUpperCase()
    if (q) setSymbol(q)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-[#f0f0f8] text-lg">Trading View</h1>
        </div>
        <form onSubmit={submitSearch} className="relative">
          <Search className="w-4 h-4 text-[#5a5a72] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symbol (e.g. TSLA, XAUUSD)…"
            className="w-full sm:w-72 bg-[#16161f] border border-[#2a2a3a] rounded-lg pl-9 pr-3 py-2 text-sm text-[#f0f0f8] outline-none focus:border-yellow-500/40 placeholder-[#3a3a4a] uppercase"
          />
        </form>
      </div>

      {/* preset tabs */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.symbol}
            onClick={() => setSymbol(p.symbol)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              symbol === p.symbol
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                : 'text-[#5a5a72] hover:bg-[#1e1e2c] border border-transparent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* chart */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden h-[calc(100vh-13rem)] min-h-[420px]">
        <TradingViewChart symbol={symbol} />
      </div>

      <p className="text-[10px] text-[#5a5a72]">
        Charts by <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="text-yellow-500/70 hover:text-yellow-500">TradingView</a>.
        Tip: type an exchange-qualified symbol like <span className="text-[#9090a8]">NASDAQ:AAPL</span> or <span className="text-[#9090a8]">OANDA:XAUUSD</span> for exact matches.
      </p>
    </div>
  )
}
