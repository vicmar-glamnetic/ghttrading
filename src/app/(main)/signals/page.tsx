'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PostCard } from '@/components/posts/PostCard'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'
import type { PostWithDetails } from '@/types'

export default function SignalsPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all')

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => {
      const signals = (d.posts || []).filter((p: PostWithDetails) =>
        p.feeling === 'signal-buy' || p.feeling === 'signal-sell'
      )
      setPosts(signals)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? posts
    : posts.filter(p => p.feeling === `signal-${filter}`)

  const buyCount = posts.filter(p => p.feeling === 'signal-buy').length
  const sellCount = posts.filter(p => p.feeling === 'signal-sell').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-[#f0f0f8] text-lg">Trading Signals</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Signals', value: posts.length, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'BUY Signals', value: buyCount, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
          { label: 'SELL Signals', value: sellCount, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 text-center ${bg} bg-[#16161f]`}>
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-[#5a5a72] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'buy', 'sell'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              filter === f
                ? f === 'buy' ? 'badge-buy' : f === 'sell' ? 'badge-sell' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                : 'text-[#5a5a72] hover:bg-[#1e1e2c] border border-transparent'
            }`}>
            {f === 'all' ? 'All Signals' : `${f.toUpperCase()} Only`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-[#16161f] rounded-xl border border-[#2a2a3a] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <Zap className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-[#5a5a72]">No signals yet. Be the first to post one!</p>
        </div>
      ) : (
        filtered.map(post => <PostCard key={post.id} post={post} currentUserId={session?.user?.id || ''} />)
      )}
    </div>
  )
}
