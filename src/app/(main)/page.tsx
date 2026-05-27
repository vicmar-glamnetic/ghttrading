'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CreatePost } from '@/components/posts/CreatePost'
import { PostCard } from '@/components/posts/PostCard'
import type { PostWithDetails } from '@/types'

export default function FeedPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPosts = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/posts?cursor=${cursor}` : '/api/posts'
    const res = await fetch(url)
    const data = await res.json()
    return data
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

  function handlePostCreated(post: unknown) {
    setPosts(prev => [post as PostWithDetails, ...prev])
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-1">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-2 w-16 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CreatePost onPostCreated={handlePostCreated} />

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">👋</div>
          <h3 className="text-lg font-semibold mb-2">Welcome to GHT Community!</h3>
          <p className="text-gray-500 text-sm">Start by making your first post or following some people.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={session?.user?.id || ''} />
        ))
      )}

      {nextCursor && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-3 bg-white rounded-xl shadow-sm border border-gray-200 text-sm text-blue-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : 'Load more posts'}
        </button>
      )}
    </div>
  )
}
