'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Flag, BadgeCheck, ImageIcon, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PostCard } from '@/components/posts/PostCard'
import type { PostWithDetails } from '@/types'

interface PageDetail {
  id: string
  name: string
  description: string | null
  category: string
  image: string | null
  coverImage: string | null
  verified: boolean
  createdAt: string
  ownerId: string
  owner: { id: string; name: string | null; image: string | null; username: string | null }
  _count: { followers: number; posts: number }
  isFollowing: boolean
}

const categoryLabel = (v: string) => ({ general: 'General', signals: 'Signals', analysis: 'Analysis', education: 'Education', news: 'Market News', lifestyle: 'Trader Life' }[v] ?? v)

function ComposeBox({ pageId, onPost }: { pageId: string; onPost: (post: PostWithDetails) => void }) {
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/pages/${pageId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, images }),
      })
      if (!res.ok) return
      const post = await res.json()
      onPost(post)
      setContent('')
      setImages([])
    } finally {
      setPosting(false)
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (ev.target?.result) setImages(i => [...i, ev.target!.result as string]) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar src={session?.user?.image} name={session?.user?.name} size="sm" className="shrink-0" />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Post as this page…"
          rows={2}
          className="flex-1 bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-xl px-3 py-2 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors resize-none"
        />
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap ml-9">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#2a2a3a]" />
              <button type="button" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between ml-9">
        <label className="cursor-pointer text-[#5a5a72] hover:text-yellow-500 transition-colors p-1.5 rounded-lg hover:bg-[#2a2a3a]">
          <ImageIcon className="w-4 h-4" />
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImage} />
        </label>
        <Button type="submit" variant="gold" size="sm" loading={posting} disabled={!content.trim()} className="gap-1.5 text-xs">
          <Send className="w-3.5 h-3.5" /> Post
        </Button>
      </div>
    </form>
  )
}

export default function PageDetailPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
  const { data: session } = useSession()
  const [page, setPage] = useState<PageDetail | null>(null)
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [loadingPage, setLoadingPage] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)

  const fetchPage = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}`)
      if (res.status === 404) { setNotFound(true); return }
      const d = await res.json()
      setPage(d)
    } catch {
      setNotFound(true)
    } finally {
      setLoadingPage(false)
    }
  }, [pageId])

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/pages/${pageId}/posts${cursor ? `?cursor=${cursor}` : ''}`
      const res = await fetch(url)
      const d = await res.json()
      if (cursor) setPosts(p => [...p, ...(d.posts ?? [])])
      else setPosts(d.posts ?? [])
      setNextCursor(d.nextCursor)
    } finally {
      setLoadingPosts(false)
      setLoadingMore(false)
    }
  }, [pageId])

  useEffect(() => { fetchPage() }, [fetchPage])
  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleFollow() {
    if (!page) return
    setFollowing(true)
    try {
      const res = await fetch(`/api/pages/${pageId}/follow`, { method: 'POST' })
      const d = await res.json()
      setPage(p => p ? {
        ...p,
        isFollowing: d.following,
        _count: { ...p._count, followers: p._count.followers + (d.following ? 1 : -1) }
      } : p)
    } finally {
      setFollowing(false)
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link href="/pages" className="flex items-center gap-2 text-sm text-[#9090a8] hover:text-yellow-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Pages
        </Link>
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <p className="text-[#f0f0f8] font-semibold mb-1">Page not found</p>
          <p className="text-[#5a5a72] text-sm">This page may have been deleted.</p>
        </div>
      </div>
    )
  }

  const isOwner = page?.ownerId === session?.user?.id

  return (
    <div className="space-y-4">
      <Link href="/pages" className="flex items-center gap-2 text-sm text-[#9090a8] hover:text-yellow-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Pages
      </Link>

      {loadingPage ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden animate-pulse">
          <div className="h-24 bg-[#2a2a3a]" />
          <div className="p-4 space-y-2">
            <div className="h-5 w-48 bg-[#2a2a3a] rounded" />
            <div className="h-3 w-full bg-[#2a2a3a] rounded" />
          </div>
        </div>
      ) : page ? (
        <>
          {/* Page header */}
          <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
            {/* Cover */}
            <div className="h-24 bg-linear-to-br from-yellow-500/15 via-yellow-500/5 to-[#1e1e2c] relative">
              {page.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.coverImage} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-end justify-between gap-3 -mt-6 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border-4 border-[#16161f] flex items-center justify-center shadow-lg overflow-hidden">
                  {page.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.image} alt={page.name} className="w-full h-full object-cover" />
                  ) : (
                    <Flag className="w-7 h-7 text-yellow-500" />
                  )}
                </div>
                <div className="pb-1">
                  {isOwner ? (
                    <span className="text-xs text-yellow-500 font-semibold">Your Page</span>
                  ) : (
                    <Button
                      variant={page.isFollowing ? 'secondary' : 'gold'}
                      size="sm"
                      onClick={handleFollow}
                      loading={following}
                      className="text-xs"
                    >
                      {page.isFollowing ? 'Following' : '+ Follow'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <h1 className="font-bold text-[#f0f0f8] text-xl leading-tight">{page.name}</h1>
                {page.verified && <BadgeCheck className="w-5 h-5 text-yellow-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-yellow-600 font-medium">{categoryLabel(page.category)}</span>
                <span className="text-xs text-[#5a5a72]">{page._count.followers.toLocaleString()} followers</span>
                <span className="text-xs text-[#5a5a72]">{page._count.posts} posts</span>
              </div>
              {page.description && <p className="text-sm text-[#9090a8] leading-relaxed">{page.description}</p>}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2a2a3a]">
                <Avatar src={page.owner.image} name={page.owner.name} size="xs" />
                <span className="text-xs text-[#5a5a72]">Page by</span>
                <Link href={`/profile/${page.owner.id}`} className="text-xs text-[#f0f0f8] hover:text-yellow-500 transition-colors font-medium">
                  {page.owner.name || 'Trader'}
                </Link>
              </div>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {isOwner && <ComposeBox pageId={pageId} onPost={post => { setPosts(p => [post, ...p]); setPage(pg => pg ? { ...pg, _count: { ...pg._count, posts: pg._count.posts + 1 } } : pg) }} />}

            {loadingPosts ? (
              <div className="space-y-3 animate-pulse">
                {[1,2].map(i => (
                  <div key={i} className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 space-y-3">
                    <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-[#2a2a3a]" /><div className="flex-1 space-y-1.5"><div className="h-3 w-32 bg-[#2a2a3a] rounded" /><div className="h-2 w-24 bg-[#2a2a3a] rounded" /></div></div>
                    <div className="h-3 w-full bg-[#2a2a3a] rounded" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] py-12 text-center">
                <Flag className="w-8 h-8 text-[#2a2a3a] mx-auto mb-2" />
                <p className="text-[#5a5a72] text-sm">{isOwner ? 'No posts yet. Share something with your followers!' : 'No posts yet.'}</p>
              </div>
            ) : (
              <>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={session?.user?.id || ''}
                    onDelete={postId => { setPosts(p => p.filter(x => x.id !== postId)); setPage(pg => pg ? { ...pg, _count: { ...pg._count, posts: Math.max(0, pg._count.posts - 1) } } : pg) }}
                  />
                ))}
                {nextCursor && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" loading={loadingMore}
                      onClick={() => { setLoadingMore(true); fetchPosts(nextCursor) }} className="text-xs">
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
