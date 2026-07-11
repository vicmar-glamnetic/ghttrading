'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PostCard } from '@/components/posts/PostCard'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'
import type { PostWithDetails } from '@/types'

const PAGE_SIZE = 10

export default function SignalsPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => {
      const signals = (d.posts || []).filter((p: PostWithDetails) =>
        p.feeling === 'signal-buy' || p.feeling === 'signal-sell'
      )
      setPosts(signals)
      setLoading(false)
    })
  }, [])

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.feeling === `signal-${filter}`)
  const buyCount = posts.filter(p => p.feeling === 'signal-buy').length
  const sellCount = posts.filter(p => p.feeling === 'signal-sell').length

  // Back to page 1 whenever the filter changes the result set.
  useEffect(() => { setPage(1) }, [filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const pagedPosts = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Trading Signals</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Signals', value: posts.length,  icon: Zap,         color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'BUY Signals',   value: buyCount,       icon: TrendingUp,  color: 'text-green-400',  bg: 'bg-green-400/10  border-green-400/20'  },
          { label: 'SELL Signals',  value: sellCount,      icon: TrendingDown, color: 'text-red-400',   bg: 'bg-red-400/10    border-red-400/20'    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 text-center bg-surface ${bg}`}>
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-ink3 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'buy', 'sell'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              filter === f
                ? f === 'buy'  ? 'badge-buy'
                : f === 'sell' ? 'badge-sell'
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                : 'text-ink3 hover:bg-elevated border border-transparent'
            }`}>
            {f === 'all' ? 'All Signals' : `${f.toUpperCase()} Only`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface rounded-xl border border-line animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <Zap className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-ink3">No signals yet. Be the first to post one!</p>
        </div>
      ) : (
        <>
          {pagedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session?.user?.id || ''}
              onDelete={handlePostDeleted}
            />
          ))}

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
              <p className="text-[11px] text-ink3">
                Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
                >
                  Prev
                </button>
                <span className="text-[11px] text-ink3 tabular-nums px-1">{pageSafe} / {pageCount}</span>
                <button
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  disabled={pageSafe >= pageCount}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
