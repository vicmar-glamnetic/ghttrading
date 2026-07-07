'use client'
import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PostCard } from '@/components/posts/PostCard'
import { ArrowLeft } from 'lucide-react'
import type { PostWithDetails } from '@/types'

export default function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [post, setPost] = useState<PostWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(d => { if (d) setPost(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [postId])

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-ink2 hover:text-yellow-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {loading ? (
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
      ) : notFound ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <p className="text-ink font-semibold mb-1">Post not found</p>
          <p className="text-ink3 text-sm">This post may have been deleted.</p>
        </div>
      ) : post ? (
        <PostCard
          post={post}
          currentUserId={session?.user?.id || ''}
          onDelete={() => router.push('/')}
        />
      ) : null}
    </div>
  )
}
