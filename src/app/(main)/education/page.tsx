'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MediaUpload } from '@/components/posts/MediaUpload'
import { BookOpen, Image as ImageIcon, Play, Plus, Trash2, X, Newspaper, ExternalLink } from 'lucide-react'
import type { PostWithDetails } from '@/types'

interface UploadedFile { url: string; name: string; type: string }
interface Author { id: string; name: string | null; image: string | null; username: string | null }
interface Video { id: string; title: string; embedUrl: string; educator: string | null; author: Author }
interface NewsItem { title: string; link: string; pubDate: string; image: string | null }
type Tab = 'videos' | 'posts' | 'news'

function newsTimeAgo(pubDate: string): string {
  const d = new Date(pubDate.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// Normalise common video URLs to their embeddable form.
function toEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
    if (u.hostname.includes('vimeo.com') && /^\/\d+/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`
    return url
  } catch { return url }
}

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
        body: JSON.stringify({ content, images: [...images, ...videos], feeling: 'education', privacy: 'public' }),
      })
      if (!res.ok) { setError('Failed to post. Please try again.'); return }
      const post = await res.json()
      onCreated(post as PostWithDetails)
      setContent(''); setMediaFiles([]); setShowMedia(false); setExpanded(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      {!expanded ? (
        <div className="flex gap-3 items-center">
          <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
          <button
            onClick={() => setExpanded(true)}
            className="flex-1 bg-elevated hover:bg-[#24243a] border border-line hover:border-purple-500/30 rounded-xl px-4 py-3 text-left text-sm text-ink3 transition-all"
          >
            Share trading knowledge, tips, or tutorials…
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold badge-education">
                <BookOpen className="w-3 h-3" /> Education
              </div>
              <textarea
                autoFocus value={content} onChange={e => setContent(e.target.value)}
                placeholder="Share trading knowledge, strategies, tips, or tutorials with the community…"
                className="w-full resize-none bg-transparent outline-none text-ink placeholder-ink3 text-sm min-h-25 leading-relaxed"
                rows={4}
              />
            </div>
          </div>
          {(showMedia || mediaFiles.length > 0) && <MediaUpload onUpload={setMediaFiles} existingFiles={mediaFiles} />}
          <div className="flex items-center justify-between pt-3 border-t border-line">
            <button type="button" onClick={() => setShowMedia(!showMedia)} className="p-2 hover:bg-elevated rounded-lg text-ink3 hover:text-purple-400 transition-colors" title="Add photo or video">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setExpanded(false); setShowMedia(false); setMediaFiles([]) }}>Cancel</Button>
              <Button type="submit" variant="gold" size="sm" loading={submitting} disabled={!content.trim()}>Post</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default function EducationPage() {
  const { data: session } = useSession()
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  const [tab, setTab] = useState<Tab>('videos')
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [videos, setVideos] = useState<Video[]>([])
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => {
      setPosts((d.posts || []).filter((p: PostWithDetails) => p.feeling === 'education'))
      setLoadingPosts(false)
    })
  }, [])

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/education/videos')
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } finally {
      setLoadingVideos(false)
    }
  }, [])
  useEffect(() => { loadVideos() }, [loadVideos])

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(d => setNews(Array.isArray(d) ? d : []))
      .catch(() => setNews([]))
      .finally(() => setLoadingNews(false))
  }, [])

  async function deleteVideo(v: Video) {
    if (!confirm(`Delete "${v.title}"?`)) return
    setVideos(prev => prev.filter(x => x.id !== v.id))
    await fetch(`/api/education/videos/${v.id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Education</h1>
        {tab === 'videos' && isStaff && (
          <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="ml-auto gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add video
          </Button>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        {([['videos', 'Videos'], ['posts', 'Posts'], ['news', 'Forex News']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ---- Videos ---- */}
      {tab === 'videos' && (
        loadingVideos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="aspect-video bg-surface rounded-xl border border-line animate-pulse" />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-surface rounded-xl border border-line p-12 text-center">
            <Play className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
            <p className="text-ink3">{isStaff ? 'No videos yet — add your first tutorial.' : 'No videos yet — check back soon.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {videos.map(v => (
              <div key={v.id} className="rounded-2xl border border-line bg-surface overflow-hidden">
                <div className="aspect-video bg-black">
                  <iframe src={toEmbed(v.embedUrl)} title={v.title} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{v.title}</p>
                    <p className="text-xs text-ink3 truncate">{v.educator || v.author.name}</p>
                  </div>
                  {isStaff && (
                    <button onClick={() => deleteVideo(v)} className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ---- Posts ---- */}
      {tab === 'posts' && (
        <div className="space-y-4">
          <CreateEducationPost onCreated={post => setPosts(prev => [post, ...prev])} />
          {loadingPosts ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
          ) : posts.length === 0 ? (
            <div className="bg-surface rounded-xl border border-line p-12 text-center">
              <BookOpen className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-ink mb-2">No education posts yet</h3>
              <p className="text-ink3 text-sm">Share your first trading lesson above!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} currentUserId={session?.user?.id || ''} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
            ))
          )}
        </div>
      )}

      {/* ---- Forex News ---- */}
      {tab === 'news' && (
        loadingNews ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
        ) : news.length === 0 ? (
          <div className="bg-surface rounded-xl border border-line p-12 text-center">
            <Newspaper className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
            <p className="text-ink3">Couldn&apos;t load news right now — check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 bg-surface rounded-xl border border-line p-3 hover:border-yellow-500/30 transition-colors group">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-lg shrink-0 bg-elevated" loading="lazy" />
                )}
                <div className="min-w-0 flex flex-col">
                  <p className="text-sm font-semibold text-ink leading-snug line-clamp-3 group-hover:text-yellow-500 transition-colors">{n.title}</p>
                  <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-ink3">
                    <span>Investing.com</span>
                    {newsTimeAgo(n.pubDate) && <><span>·</span><span>{newsTimeAgo(n.pubDate)}</span></>}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {showAdd && <AddVideo onClose={() => setShowAdd(false)} onAdded={v => { setVideos(prev => [v, ...prev]); setShowAdd(false) }} />}
    </div>
  )
}

/* ---- staff: add educator video ---- */
function AddVideo({ onClose, onAdded }: { onClose: () => void; onAdded: (v: Video) => void }) {
  const [title, setTitle] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [educator, setEducator] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim() || !embedUrl.trim()) { setError('Title and video URL are required.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/education/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, embedUrl, educator }),
      })
      if (res.ok) onAdded(await res.json())
      else setError((await res.json().catch(() => ({}))).error || 'Failed to add video')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">Add video</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" className={inputCls} />
          <input value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Video URL (YouTube, Vimeo, etc.)" className={inputCls} />
          <input value={educator} onChange={e => setEducator(e.target.value)} placeholder="Educator name (optional)" className={inputCls} />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">Add video</Button>
        </div>
      </div>
    </div>
  )
}
