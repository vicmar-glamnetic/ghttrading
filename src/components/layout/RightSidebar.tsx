'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface SuggestedUser {
  id: string; name: string | null; image: string | null; username: string | null; bio: string | null
}

const marketData = [
  { pair: 'XAUUSD', price: '2,345.80', change: '+1.24%', up: true },
  { pair: 'XAGUSD', price: '29.45', change: '+0.87%', up: true },
  { pair: 'EURUSD', price: '1.0842', change: '-0.12%', up: false },
  { pair: 'GBPUSD', price: '1.2654', change: '+0.34%', up: true },
  { pair: 'BTCUSD', price: '67,420', change: '+2.18%', up: true },
]

export function RightSidebar() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])

  useEffect(() => {
    fetch('/api/users/search?q=a')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSuggestions(d.slice(0, 4)) })
      .catch(() => {})
  }, [])

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-60 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4">
      {/* Market Watch */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2a2a3a]">
          <Activity className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-[#f0f0f8]">Market Watch</span>
        </div>
        <div className="divide-y divide-[#2a2a3a]">
          {marketData.map(m => (
            <div key={m.pair} className="flex items-center justify-between px-3 py-2 hover:bg-[#1e1e2c] transition-colors">
              <div>
                <p className="text-xs font-bold text-[#f0f0f8]">{m.pair}</p>
                <p className="text-xs text-[#5a5a72]">{m.price}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${m.up ? 'text-green-400' : 'text-red-400'}`}>
                {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.change}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#5a5a72] p-2">Indicative prices only</p>
      </div>

      {/* Suggested Traders */}
      {suggestions.length > 0 && (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#2a2a3a]">
            <span className="text-sm font-bold text-[#f0f0f8]">Traders to Follow</span>
          </div>
          <div className="divide-y divide-[#2a2a3a]">
            {suggestions.map(user => (
              <div key={user.id} className="flex items-center gap-2 p-3 hover:bg-[#1e1e2c] transition-colors">
                <Link href={`/profile/${user.id}`}>
                  <Avatar src={user.image} name={user.name} size="sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-[#f0f0f8] hover:text-yellow-500 truncate block transition-colors">
                    {user.name}
                  </Link>
                  <p className="text-xs text-[#5a5a72] truncate">@{user.username}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs py-0.5 px-2 shrink-0">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
