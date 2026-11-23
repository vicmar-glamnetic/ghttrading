'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Smartphone } from 'lucide-react'
import { OnlineNow } from '@/components/OnlineNow'
import { isGoldMarketOpen } from '@/lib/marketHours'
import { PanelSection } from './PanelSection'

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
    <PanelSection
      label="XAUUSD · Gold"
      meta={open !== null && (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${open ? 'text-green-400' : 'text-ink3'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-ink3'}`} />
          {open ? 'Live' : 'Closed'}
        </span>
      )}
    >
      <div className="px-3 pb-3"><div ref={ref} className="h-44 overflow-hidden rounded-lg bg-[#0d0d14]" /></div>
    </PanelSection>
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
      if (Array.isArray(d)) setIdeas(d.slice(0, 4))
    }).catch(() => {})
  }, [])
  if (!ideas.length) return null
  return (
    <PanelSection label="Latest signals" meta={<Link href="/ideas" className="text-[10px] font-semibold text-ink3 hover:text-yellow-500 transition-colors">See all</Link>}>
      <ul className="pb-2">
        {ideas.map((idea, i) => {
          const isBuy = idea.direction === 'buy'
          const open = idea.status === 'pending'
          return (
            <li key={i}>
              <Link href="/ideas" className="flex items-center gap-2 px-4 py-2 hover:bg-elevated transition-colors">
                <span title={open ? 'Live' : 'Closed'} className={`w-1.5 h-1.5 shrink-0 rounded-full ${open ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
                <span className="text-xs font-bold text-ink">{idea.symbol}</span>
                <span className={`text-[10px] font-black rounded px-1.5 py-0.5 ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
                <span className="ml-auto truncate text-[11px] text-ink2 tabular-nums">{entryLabel(idea)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </PanelSection>
  )
}

export function RightSidebar() {
  return (
    <aside
      className="hidden xl:flex flex-col w-72 shrink-0 sticky self-start overflow-y-auto scrollbar-none border-l border-line bg-sunken"
      style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))', height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))' }}
    >
      <LiveGoldWidget />
      <LatestIdea />
      <OnlineNow />

      <PanelSection label="Join Discord">
        <div className="px-4 pb-4">
          <p className="text-xs text-ink2">Live gold sessions Mon–Fri</p>
          <a
            href="https://discord.gg/Vzj8MNwvH"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg transition-colors"
          >
            Join Now
          </a>
        </div>
      </PanelSection>

      <div className="mt-auto px-4 py-4 space-y-2 text-xs text-ink3">
        <Link href="/install" className="flex items-center gap-2 font-semibold text-ink2 hover:text-yellow-500 transition-colors">
          <Smartphone className="w-4 h-4" /> Install as app
        </Link>
        <div className="flex flex-wrap gap-x-3">
          <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-yellow-500 transition-colors">Help</Link>
        </div>
        <p>community.ghttrading.co</p>
        <p>© 2026 Gold Heist Trading</p>
      </div>
    </aside>
  )
}
