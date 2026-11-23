'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, BadgeCheck, Share2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { RichText } from '@/components/posts/RichText'
import { MentionInput } from '@/components/posts/MentionInput'
import { timeAgo } from '@/lib/utils'
import type { PostWithDetails } from '@/types'

type Preview = {
  id: string
  content: string
  images: string[]
  createdAt: Date | string
  author: { id: string; name: string | null; image: string | null }
  page?: { id: string; name: string; image: string | null; verified: boolean } | null
}

const isVideo = (url: string) => url.startsWith('data:video') || /\.(mp4|mov|webm|avi)$/i.test(url)

/** The original post, shown inside a share. Tapping it opens the original. */
export function SharedPostEmbed({ post, compact = false }: { post: Preview | null; compact?: boolean }) {
  const router = useRouter()
  if (!post) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-sunken px-4 py-5 text-center">
        <p className="text-sm font-semibold text-ink2">This post isn’t available</p>
        <p className="text-xs text-ink3 mt-0.5">It was deleted, or its owner changed who can see it.</p>
      </div>
    )
  }
  const image = post.images.find(m => !isVideo(m))
  const name = post.page?.name ?? post.author.name
  const avatar = post.page?.image ?? post.author.image
  const href = post.page ? `/pages/${post.page.id}` : `/profile/${post.author.id}`

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/posts/${post.id}`)}
      onKeyDown={e => { if (e.key === 'Enter') router.push(`/posts/${post.id}`) }}
      className="mt-3 block rounded-xl border border-line overflow-hidden hover:border-line2 transition-colors cursor-pointer text-left"
    >
      {image && !compact && (
        // eslint-disable-next-line @next/next/no-img-element -- mixed hosts and data: URLs
        <img src={image} alt="" className="w-full max-h-80 object-cover bg-app" />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Link href={href} onClick={e => e.stopPropagation()} className="shrink-0">
            <Avatar src={avatar} name={name} size="xs" />
          </Link>
          <div className="min-w-0">
            <Link href={href} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs font-semibold text-ink hover:text-yellow-500 transition-colors">
              <span className="truncate">{name}</span>
              {post.page?.verified && <BadgeCheck className="w-3 h-3 text-yellow-500 shrink-0" />}
            </Link>
            <p className="text-[10px] text-ink3">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {post.content && (
          <p className={`mt-2 text-sm text-ink whitespace-pre-wrap ${compact ? 'line-clamp-3' : 'line-clamp-6'}`}>
            <RichText text={post.content} />
          </p>
        )}
      </div>
    </div>
  )
}

/** "Share to your feed" with an optional message. */
export function SharePostModal({ postId, preview, onClose, onShared }: {
  postId: string
  preview: Preview | null
  onClose: () => void
  onShared: (post: PostWithDetails) => void
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function share() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, sharedPostId: postId, privacy: 'public' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not share this post.')
      onShared(d as PostWithDetails)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share this post.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">Share to your feed</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <MentionInput
            multiline
            value={text}
            onChange={setText}
            rows={3}
            autoFocus
            placeholder="Say something about this… (optional)"
            className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3 resize-none"
          />
          <SharedPostEmbed post={preview} compact />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={share} loading={saving} className="flex-1 gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Share now
          </Button>
        </div>
      </div>
    </div>
  )
}
