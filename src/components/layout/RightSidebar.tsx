'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Activity, Star, Users } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface SuggestedUser {
  id: string; name: string | null; image: string | null; username: string | null
}

const goldFacts = [
  'Gold has been a store of value for over 5,000 years.',
  '1 troy ounce = 31.1 grams of pure gold.',
  'Central banks hold ~35,000 tonnes of gold worldwide.',
  'Gold is priced in USD — watch the DXY for clues.',
  'Inflation fears & geopolitical risk push gold higher.',
]

// Live XAUUSD price + mini chart via TradingView (real feed, theme-aware).
function LiveGoldWidget() {
  const { resolved } = useTheme()
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = container.current
    if (!el) return
    el.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: 'OANDA:XAUUSD',
      width: '100%',
      height: 180,
      locale: 'en',
      dateRange: '1D',
      colorTheme: resolved,
      isTransparent: true,
      autosize: false,
    })
    el.appendChild(script)
    return () => { el.innerHTML = '' }
  }, [resolved])

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Activity className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">XAUUSD · Gold</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
        </span>
      </div>
      <div key={resolved} ref={container} className="px-2 py-1" />
    </div>
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

function TradersToFollow() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/users/search?q=a')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSuggestions(d.slice(0, 4)) })
      .catch(() => {})
  }, [])

  async function handleFollow(userId: string) {
    await fetch(`/api/users/${userId}/follow`, { method: 'POST' })
    setFollowed(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  if (!suggestions.length) return null

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Users className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Traders to Follow</span>
      </div>
      <div className="divide-y divide-line">
        {suggestions.map(user => (
          <div key={user.id} className="flex items-center gap-2 p-3 hover:bg-elevated transition-colors">
            <Link href={`/profile/${user.id}`} className="shrink-0">
              <Avatar src={user.image} name={user.name} size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-ink hover:text-yellow-500 truncate block transition-colors">
                {user.name || 'Trader'}
              </Link>
              <p className="text-[10px] text-ink3 truncate">@{user.username || 'trader'}</p>
            </div>
            <Button
              variant={followed.has(user.id) ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleFollow(user.id)}
              className="text-xs py-0.5 px-2 shrink-0"
            >
              {followed.has(user.id) ? 'Following' : 'Follow'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-3 w-60 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      <LiveGoldWidget />
      <GoldFactWidget />
      <TradersToFollow />

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
