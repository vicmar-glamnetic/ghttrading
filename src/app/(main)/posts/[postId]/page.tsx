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
        className="flex items-center gap-2 text-sm text-[#9090a8] hover:text-yellow-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {loading ? (
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
          </div>
        </div>
      ) : notFound ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <p className="text-[#f0f0f8] font-semibold mb-1">Post not found</p>
          <p className="text-[#5a5a72] text-sm">This post may have been deleted.</p>
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
