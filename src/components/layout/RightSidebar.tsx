'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, Lightbulb, Globe, Smartphone } from 'lucide-react'
import { SessionsClock } from '@/components/SessionsClock'

// Inject a TradingView external-embedding widget into a container.
// Market widgets are always dark to match the trading-terminal aesthetic.
function useTvWidget(src: string, config: Record<string, unknown>) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.innerHTML = JSON.stringify({ ...config, colorTheme: 'dark', isTransparent: false })
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [src])
  return ref
}

function LiveGoldWidget() {
  const ref = useTvWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js',
    { symbol: 'OANDA:XAUUSD', width: '100%', height: 180, locale: 'en', dateRange: '1D', autosize: false },
  )
  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Activity className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">XAUUSD · Gold</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
        </span>
      </div>
      <div ref={ref} className="p-1 bg-[#0d0d14]" />
    </div>
  )
}

interface LatestIdeaT {
  symbol: string; direction: 'buy' | 'sell'; status: string
  entryLow: number | null; entryHigh: number | null
}
function LatestIdea() {
  const [idea, setIdea] = useState<LatestIdeaT | null>(null)
  useEffect(() => {
    fetch('/api/ideas?scope=community').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length) setIdea(d[0])
    }).catch(() => {})
  }, [])
  if (!idea) return null
  const isBuy = idea.direction === 'buy'
  const entry = idea.entryLow != null && idea.entryHigh != null && idea.entryLow !== idea.entryHigh
    ? `${idea.entryLow} – ${idea.entryHigh}` : `${idea.entryLow ?? idea.entryHigh ?? ''}`
  return (
    <Link href="/ideas" className="block bg-surface rounded-xl border border-line overflow-hidden hover:border-yellow-500/30 transition-colors">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Latest Signal</span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">{idea.symbol}</span>
          <span className={`text-xs font-black rounded px-2 py-0.5 ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${idea.status === 'pending' ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
          <span className="text-xs font-bold text-blue-400">{idea.status === 'pending' ? 'LIVE' : 'Closed'}</span>
          {entry && <span className="text-xs text-ink2 ml-1">Entry {entry}</span>}
        </div>
      </div>
    </Link>
  )
}

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-3 w-60 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      <LiveGoldWidget />
      <LatestIdea />
      <SessionsClock />

      {/* Join Discord */}
      <div className="p-3 rounded-xl bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">JOIN DISCORD</span>
        </div>
        <p className="text-xs text-ink2">Live gold sessions Mon–Fri</p>
        <a
          href="https://discord.gg/Vzj8MNwvH"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1.5 rounded-lg transition-colors"
        >
          Join Now
        </a>
      </div>

      {/* Install as app */}
      <Link href="/install" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink2 hover:text-yellow-500 hover:border-yellow-500/30 transition-colors">
        <Smartphone className="w-4 h-4" /> Install as app
      </Link>

      <div className="text-xs text-ink3 px-1 space-y-1">
        <div className="flex flex-wrap gap-x-2">
          <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-yellow-500 transition-colors">Help</Link>
        </div>
        <p>community.ghttrading.co</p>
      </div>
    </aside>
  )
}
