'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TrendingUp, TrendingDown, Activity, Star, Users } from 'lucide-react'

interface SuggestedUser {
  id: string; name: string | null; image: string | null; username: string | null
}

// Static XAUUSD snapshot — replace with a live feed when ready
const gold = {
  price: '2,345.80',
  change: '+12.40',
  changePct: '+0.53%',
  high: '2,358.20',
  low: '2,331.50',
  bid: '2,345.60',
  ask: '2,346.00',
  up: true,
}

const goldFacts = [
  'Gold has been a store of value for over 5,000 years.',
  '1 troy ounce = 31.1 grams of pure gold.',
  'Central banks hold ~35,000 tonnes of gold worldwide.',
  'Gold is priced in USD — watch the DXY for clues.',
  'Inflation fears & geopolitical risk push gold higher.',
]

function GoldPriceWidget() {
  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2a2a3a]">
        <Activity className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-[#f0f0f8]">XAUUSD · Gold</span>
        <span className="ml-auto text-[10px] text-[#5a5a72] bg-[#0a0a0f] border border-[#2a2a3a] rounded px-1.5 py-0.5">
          Indicative
        </span>
      </div>

      {/* Main price */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#f0f0f8]">{gold.price}</span>
          <span className={`text-sm font-bold flex items-center gap-0.5 ${gold.up ? 'text-green-400' : 'text-red-400'}`}>
            {gold.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {gold.changePct}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${gold.up ? 'text-green-400' : 'text-red-400'}`}>
          {gold.change} today
        </p>
      </div>

      {/* Bid / Ask / High / Low */}
      <div className="grid grid-cols-2 gap-px bg-[#2a2a3a] border-t border-[#2a2a3a]">
        {[
          { label: 'Bid',  value: gold.bid,  color: 'text-red-400'   },
          { label: 'Ask',  value: gold.ask,  color: 'text-green-400' },
          { label: 'High', value: gold.high, color: 'text-green-400' },
          { label: 'Low',  value: gold.low,  color: 'text-red-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#16161f] px-3 py-2">
            <p className="text-[10px] text-[#5a5a72] uppercase tracking-wider">{label}</p>
            <p className={`text-xs font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoldFactWidget() {
  const fact = goldFacts[new Date().getDay() % goldFacts.length]
  return (
    <div className="bg-[#16161f] rounded-xl border border-yellow-500/20 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
        <span className="text-xs font-bold text-yellow-500">Gold Fact</span>
      </div>
      <p className="text-xs text-[#9090a8] leading-relaxed">{fact}</p>
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
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2a2a3a]">
        <Users className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-[#f0f0f8]">Traders to Follow</span>
      </div>
      <div className="divide-y divide-[#2a2a3a]">
        {suggestions.map(user => (
          <div key={user.id} className="flex items-center gap-2 p-3 hover:bg-[#1e1e2c] transition-colors">
            <Link href={`/profile/${user.id}`} className="shrink-0">
              <Avatar src={user.image} name={user.name} size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-[#f0f0f8] hover:text-yellow-500 truncate block transition-colors">
                {user.name || 'Trader'}
              </Link>
              <p className="text-[10px] text-[#5a5a72] truncate">@{user.username || 'trader'}</p>
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
      <GoldPriceWidget />
      <GoldFactWidget />
      <TradersToFollow />

      <div className="text-xs text-[#5a5a72] px-1 space-y-1">
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
