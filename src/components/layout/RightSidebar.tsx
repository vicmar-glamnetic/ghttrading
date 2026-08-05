'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, Lightbulb, Globe, Smartphone } from 'lucide-react'
import { OnlineNow } from '@/components/OnlineNow'
import { isGoldMarketOpen } from '@/lib/marketHours'

// Shared height so every widget card in the sidebar lines up uniformly.
export const CARD_H = 'h-60'

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

/**
 * Whether gold is trading, re-checked every minute so the badge flips on its own
 * at the weekly close instead of at the next page load.
 *
 * Starts null and resolves after mount: this page is rendered on the server and
 * cached, so a status baked into the HTML would happily claim "Live" all
 * weekend. Until the client answers, the badge isn't drawn at all — better a
 * missing label for one frame than a wrong one.
 */
function useGoldMarketOpen() {
  const [open, setOpen] = useState<boolean | null>(null)
  useEffect(() => {
    const tick = () => setOpen(isGoldMarketOpen())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])
  return open
}

function LiveGoldWidget() {
  const ref = useTvWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js',
    { symbol: 'OANDA:XAUUSD', width: '100%', height: '100%', locale: 'en', dateRange: '1D', autosize: true },
  )
  const open = useGoldMarketOpen()
  return (
    <div className={`bg-surface rounded-xl border border-line overflow-hidden flex flex-col ${CARD_H}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line shrink-0">
        <Activity className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">XAUUSD · Gold</span>
        {open !== null && (
          <span className={`ml-auto inline-flex items-center gap-1 text-[10px] ${open ? 'text-green-400' : 'text-ink3'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-ink3'}`} />
            {open ? 'Live' : 'Closed'}
          </span>
        )}
      </div>
      <div ref={ref} className="flex-1 min-h-0 p-1 bg-[#0d0d14]" />
    </div>
  )
}

interface LatestIdeaT {
  symbol: string; direction: 'buy' | 'sell'; status: string
  entryLow: number | null; entryHigh: number | null
}
function entryLabel(idea: LatestIdeaT) {
  return idea.entryLow != null && idea.entryHigh != null && idea.entryLow !== idea.entryHigh
    ? `${idea.entryLow} – ${idea.entryHigh}` : `${idea.entryLow ?? idea.entryHigh ?? ''}`
}
function LatestIdea() {
  const [ideas, setIdeas] = useState<LatestIdeaT[]>([])
  useEffect(() => {
    fetch('/api/ideas?scope=community').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setIdeas(d.slice(0, 3))
    }).catch(() => {})
  }, [])
  if (!ideas.length) return null
  return (
    <Link href="/ideas" className={`flex flex-col bg-surface rounded-xl border border-line overflow-hidden hover:border-yellow-500/30 transition-colors ${CARD_H}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line shrink-0">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Latest Signals</span>
      </div>
      <div className="flex-1 min-h-0 divide-y divide-line overflow-y-auto scrollbar-none">
        {ideas.map((idea, i) => {
          const isBuy = idea.direction === 'buy'
          const entry = entryLabel(idea)
          return (
            <div key={i} className="px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">{idea.symbol}</span>
                <span className={`text-[10px] font-black rounded px-1.5 py-0.5 ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${idea.status === 'pending' ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
                <span className="text-[11px] font-bold text-blue-400">{idea.status === 'pending' ? 'LIVE' : 'Closed'}</span>
                {entry && <span className="text-[11px] text-ink2 ml-1 truncate">Entry {entry}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Link>
  )
}

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-3 w-60 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      <LiveGoldWidget />
      <LatestIdea />
      <OnlineNow />

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
