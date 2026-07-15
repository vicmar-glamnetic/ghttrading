'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { CreatePost } from '@/components/posts/CreatePost'
import { PostCard } from '@/components/posts/PostCard'
import { TrendingUp, Zap } from 'lucide-react'
import type { PostWithDetails } from '@/types'

type Filter = 'all' | 'signals' | 'analysis'

function PostSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-line p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-line" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-line rounded" />
          <div className="h-2 w-20 bg-line rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-line rounded" />
        <div className="h-3 w-4/5 bg-line rounded" />
      </div>
    </div>
  )
}

interface FeedClientProps {
  initialPosts: PostWithDetails[]
  initialNextCursor: string | undefined
  currentUserId: string
}

export function FeedClient({ initialPosts, initialNextCursor, currentUserId }: FeedClientProps) {
  const [posts, setPosts] = useState<PostWithDetails[]>(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/posts?cursor=${nextCursor}`)
      const data = await res.json()
      setPosts(prev => [...prev, ...(data.posts || [])])
      setNextCursor(data.nextCursor || null)
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  // Infinite scroll: auto-load the next page when the sentinel nears the viewport.
  // Only for the unfiltered feed — Signals/Analysis filter client-side, so their
  // pagination isn't server-cursor-aware.
  const canLoadMore = Boolean(nextCursor) && filter === 'all'
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !canLoadMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [canLoadMore, loadMore])

  const filtered = posts.filter(p => {
    if (filter === 'signals') return p.feeling === 'signal-buy' || p.feeling === 'signal-sell'
    if (filter === 'analysis') return p.feeling === 'analysis'
    return true
  })

  const filterTabs: { id: Filter; label: string }[] = [
    { id: 'all',      label: 'All'      },
    { id: 'signals',  label: 'Signals'  },
    { id: 'analysis', label: 'Analysis' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="font-bold text-ink">Trading Feed</h2>
        </div>
        <div className="flex gap-2 text-xs">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'text-ink3 hover:bg-elevated border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <CreatePost onPostCreated={post => setPosts(prev => [post as PostWithDetails, ...prev])} />

      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <TrendingUp className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">
            {filter === 'all' ? 'Welcome to GHT Community!' : `No ${filter} posts yet`}
          </h3>
          <p className="text-ink3 text-sm">
            {filter === 'all' ? 'Share your first signal or analysis to get started.' : 'Be the first to post one!'}
          </p>
        </div>
      ) : (
        filtered.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onDelete={postId => setPosts(prev => prev.filter(p => p.id !== postId))}
          />
        ))
      )}

      {canLoadMore && (
        <>
          {loadingMore && <PostSkeleton />}
          {/* Sentinel: when it scrolls into view, the next page loads automatically */}
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </>
      )}
    </div>
  )
}
