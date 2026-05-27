'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MediaUpload } from '@/components/posts/MediaUpload'
import { BookOpen, Image as ImageIcon } from 'lucide-react'
import type { PostWithDetails } from '@/types'

interface UploadedFile { url: string; name: string; type: string }

function CreateEducationPost({ onCreated }: { onCreated: (post: PostWithDetails) => void }) {
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<UploadedFile[]>([])
  const [showMedia, setShowMedia] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const images = mediaFiles.filter(f => f.type.startsWith('image')).map(f => f.url)
      const videos = mediaFiles.filter(f => f.type.startsWith('video')).map(f => f.url)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          images: [...images, ...videos],
          feeling: 'education',
          privacy: 'public',
        }),
      })
      if (!res.ok) { setError('Failed to post. Please try again.'); return }
      const post = await res.json()
      onCreated(post as PostWithDetails)
      setContent('')
      setMediaFiles([])
      setShowMedia(false)
      setExpanded(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4">
      {!expanded ? (
        <div className="flex gap-3 items-center">
          <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
          <button
            onClick={() => setExpanded(true)}
            className="flex-1 bg-[#1e1e2c] hover:bg-[#24243a] border border-[#2a2a3a] hover:border-purple-500/30 rounded-xl px-4 py-3 text-left text-sm text-[#5a5a72] transition-all"
          >
            Share trading knowledge, tips, or tutorials…
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold badge-education">
                <BookOpen className="w-3 h-3" />
                Education
              </div>
              <textarea
                autoFocus
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Share trading knowledge, strategies, tips, or tutorials with the community…"
                className="w-full resize-none bg-transparent outline-none text-[#f0f0f8] placeholder-[#5a5a72] text-sm min-h-25 leading-relaxed"
                rows={4}
              />
            </div>
          </div>

          {(showMedia || mediaFiles.length > 0) && (
            <MediaUpload onUpload={setMediaFiles} existingFiles={mediaFiles} />
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#2a2a3a]">
            <button
              type="button"
              onClick={() => setShowMedia(!showMedia)}
              className="p-2 hover:bg-[#1e1e2c] rounded-lg text-[#5a5a72] hover:text-purple-400 transition-colors"
              title="Add photo or video"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setExpanded(false); setShowMedia(false); setMediaFiles([]) }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" loading={submitting} disabled={!content.trim()}>
                Post
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

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

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-[#f0f0f8] text-lg">Education</h1>
        <span className="ml-auto text-xs text-[#5a5a72] bg-[#16161f] border border-[#2a2a3a] rounded-full px-3 py-1">
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Create post */}
      <CreateEducationPost onCreated={post => setPosts(prev => [post, ...prev])} />

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-[#16161f] rounded-xl border border-[#2a2a3a] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <BookOpen className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#f0f0f8] mb-2">No education posts yet</h3>
          <p className="text-[#5a5a72] text-sm">Share your first trading lesson above!</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={session?.user?.id || ''}
            onDelete={handlePostDeleted}
          />
        ))
      )}
    </div>
  )
}
