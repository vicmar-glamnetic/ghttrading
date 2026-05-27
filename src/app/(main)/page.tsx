'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CreatePost } from '@/components/posts/CreatePost'
import { PostCard } from '@/components/posts/PostCard'
import { TrendingUp, Zap } from 'lucide-react'
import type { PostWithDetails } from '@/types'

type Filter = 'all' | 'signals' | 'analysis'

function PostSkeleton() {
  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#2a2a3a]" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-[#2a2a3a] rounded" />
          <div className="h-2 w-20 bg-[#2a2a3a] rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-[#2a2a3a] rounded" />
        <div className="h-3 w-4/5 bg-[#2a2a3a] rounded" />
        <div className="h-3 w-3/5 bg-[#2a2a3a] rounded" />
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const loadPosts = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/posts?cursor=${cursor}` : '/api/posts'
    const res = await fetch(url)
    return res.json()
  }, [])

  useEffect(() => {
    loadPosts().then(data => {
      setPosts(data.posts || [])
      setNextCursor(data.nextCursor || null)
      setLoading(false)
    })
  }, [loadPosts])

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const data = await loadPosts(nextCursor)
    setPosts(prev => [...prev, ...(data.posts || [])])
    setNextCursor(data.nextCursor || null)
    setLoadingMore(false)
  }

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const filtered = posts.filter(p => {
    if (filter === 'signals') return p.feeling === 'signal-buy' || p.feeling === 'signal-sell'
    if (filter === 'analysis') return p.feeling === 'analysis'
    return true
  })

  const filterTabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'signals', label: 'Signals' },
    { id: 'analysis', label: 'Analysis' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="font-bold text-[#f0f0f8]">Trading Feed</h2>
        </div>
        <div className="flex gap-2 text-xs">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'text-[#5a5a72] hover:bg-[#1e1e2c] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <CreatePost onPostCreated={post => setPosts(prev => [post as PostWithDetails, ...prev])} />

      {loading ? (
        <>{[1, 2, 3].map(i => <PostSkeleton key={i} />)}</>
      ) : filtered.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <TrendingUp className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#f0f0f8] mb-2">
            {filter === 'all' ? 'Welcome to GHT Community!' : `No ${filter} posts yet`}
          </h3>
          <p className="text-[#5a5a72] text-sm">
            {filter === 'all' ? 'Share your first signal or analysis to get started.' : 'Be the first to post one!'}
          </p>
        </div>
      ) : (
        filtered.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={session?.user?.id || ''}
            onDelete={handlePostDeleted}
          />
        ))
      )}

      {nextCursor && filter === 'all' && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-3 bg-[#16161f] rounded-xl border border-[#2a2a3a] hover:border-yellow-500/30 text-sm text-yellow-500 font-medium transition-all disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more posts'}
        </button>
      )}
    </div>
  )
}
