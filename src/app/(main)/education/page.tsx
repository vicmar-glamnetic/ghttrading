'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PostCard } from '@/components/posts/PostCard'
import { BookOpen } from 'lucide-react'
import type { PostWithDetails } from '@/types'

export default function EducationPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => {
      const edu = (d.posts || []).filter((p: PostWithDetails) => p.feeling === 'education')
      setPosts(edu)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-[#f0f0f8] text-lg">Education</h1>
      </div>
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-[#16161f] rounded-xl border border-[#2a2a3a] animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <BookOpen className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-[#5a5a72]">No education posts yet.</p>
        </div>
      ) : posts.map(post => <PostCard key={post.id} post={post} currentUserId={session?.user?.id || ''} />)}
    </div>
  )
}
