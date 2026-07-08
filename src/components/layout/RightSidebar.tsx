'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, Star, CalendarDays, Lightbulb } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

const goldFacts = [
  'Gold has been a store of value for over 5,000 years.',
  '1 troy ounce = 31.1 grams of pure gold.',
  'Central banks hold ~35,000 tonnes of gold worldwide.',
  'Gold is priced in USD — watch the DXY for clues.',
  'Inflation fears & geopolitical risk push gold higher.',
]

// Inject a TradingView external-embedding widget into a container.
function useTvWidget(src: string, config: Record<string, unknown>, dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.innerHTML = JSON.stringify(config)
    el.appendChild(s)
    return () => { el.innerHTML = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])
  return ref
}

function LiveGoldWidget() {
  const { resolved } = useTheme()
  const ref = useTvWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js',
    { symbol: 'OANDA:XAUUSD', width: '100%', height: 180, locale: 'en', dateRange: '1D', colorTheme: resolved, isTransparent: true, autosize: false },
    resolved,
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
      <div key={resolved} ref={ref} className="px-2 py-1" />
    </div>
  )
}

function EconomicCalendar() {
  const { resolved } = useTheme()
  const ref = useTvWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
    { colorTheme: resolved, isTransparent: true, width: '100%', height: 420, locale: 'en', importanceFilter: '0,1', countryFilter: 'us,eu,gb,jp,cn,ca,au' },
    resolved,
  )
  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <CalendarDays className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Economic Calendar</span>
      </div>
      <div key={resolved} ref={ref} />
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
        <span className="text-sm font-bold text-ink">Latest Trade Idea</span>
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

function GoldFactWidget() {
  const fact = goldFacts[new Date().getDay() % goldFacts.length]
  return (
    <div className="bg-surface rounded-xl border border-yellow-500/20 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
        <span className="text-xs font-bold text-yellow-500">Gold Fact</span>
      </div>
      <p className="text-xs text-ink2 leading-relaxed">{fact}</p>
    </div>
  )
}

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-3 w-60 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      <LiveGoldWidget />
      <LatestIdea />
      <EconomicCalendar />
      <GoldFactWidget />

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
