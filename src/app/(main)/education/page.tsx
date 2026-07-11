'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { useMyProfile } from '@/lib/useMyProfile'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MediaUpload } from '@/components/posts/MediaUpload'
import Link from 'next/link'
import { BookOpen, Image as ImageIcon, Play, Plus, Trash2, X, Pencil, GraduationCap, MessageCircle } from 'lucide-react'
import { toEmbed } from '@/lib/video'
import type { PostWithDetails } from '@/types'

interface UploadedFile { url: string; name: string; type: string }
interface Author { id: string; name: string | null; image: string | null; username: string | null }
interface Video { id: string; title: string; embedUrl: string; educator: string | null; category: string | null; author: Author }
interface CoachLite { id: string; name: string | null; image: string | null; username: string | null }
interface CoachingOffer { id: string; topic: string; coverage: string | null; coach: CoachLite }
type Tab = 'videos' | 'posts' | 'coaching'

const CATEGORIES = [
  'Getting Started',
  'Technical Analysis',
  'Strategy',
  'Risk Management',
  'Psychology',
  'Platform & Setup',
] as const


function CreateEducationPost({ onCreated }: { onCreated: (post: PostWithDetails) => void }) {
  const { data: session } = useSession()
  const me = useMyProfile({ image: session?.user?.image, name: session?.user?.name })
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
          <Avatar src={me.image} name={me.name || session?.user?.name} size="md" />
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
            <Avatar src={me.image} name={me.name || session?.user?.name} size="md" />
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
  const [editor, setEditor] = useState<{ open: boolean; video: Video | null }>({ open: false, video: null })
  const [catFilter, setCatFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [offers, setOffers] = useState<CoachingOffer[]>([])
  const [loadingOffers, setLoadingOffers] = useState(true)
  const [offerEditor, setOfferEditor] = useState<{ open: boolean; offer: CoachingOffer | null }>({ open: false, offer: null })

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
    fetch('/api/education/coaching').then(r => r.json()).then(d => {
      setOffers(Array.isArray(d) ? d : [])
    }).catch(() => {}).finally(() => setLoadingOffers(false))
  }, [])

  async function deleteVideo(v: Video) {
    if (!confirm(`Delete "${v.title}"?`)) return
    setVideos(prev => prev.filter(x => x.id !== v.id))
    await fetch(`/api/education/videos/${v.id}`, { method: 'DELETE' })
  }

  async function deleteOffer(o: CoachingOffer) {
    if (!confirm(`Delete ${o.coach.name || 'this coach'}'s 1-on-1 offer?`)) return
    setOffers(prev => prev.filter(x => x.id !== o.id))
    await fetch(`/api/education/coaching/${o.id}`, { method: 'DELETE' })
  }

  const PER_PAGE = 6
  const filteredVideos = catFilter === 'all' ? videos : videos.filter(v => v.category === catFilter)
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / PER_PAGE))
  const curPage = Math.min(page, totalPages)
  const pagedVideos = filteredVideos.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE)
  function selectCat(c: string) { setCatFilter(c); setPage(1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Education</h1>
        {tab === 'videos' && isStaff && (
          <Button variant="gold" size="sm" onClick={() => setEditor({ open: true, video: null })} className="ml-auto gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add video
          </Button>
        )}
        {tab === 'coaching' && isStaff && (
          <Button variant="gold" size="sm" onClick={() => setOfferEditor({ open: true, offer: null })} className="ml-auto gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add offer
          </Button>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        {([['videos', 'Videos'], ['coaching', '1-on-1 Coaching'], ['posts', 'Posts']] as [Tab, string][]).map(([t, label]) => (
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
          <>
            {/* category filter — always show all categories */}
            <div className="flex gap-2 flex-wrap">
              {['all', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => selectCat(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === c ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>

            {filteredVideos.length === 0 ? (
              <div className="bg-surface rounded-xl border border-line p-10 text-center">
                <Play className="w-10 h-10 text-yellow-500/30 mx-auto mb-2" />
                <p className="text-ink3 text-sm">No videos in {catFilter === 'all' ? 'this list' : `"${catFilter}"`} yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pagedVideos.map(v => (
                    <div key={v.id} className="rounded-2xl border border-line bg-surface overflow-hidden">
                      <div className="aspect-video bg-black">
                        <iframe src={toEmbed(v.embedUrl)} title={v.title} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                      </div>
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {v.category && (
                            <span className="inline-block text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 rounded px-1.5 py-0.5 mb-1">{v.category}</span>
                          )}
                          <p className="text-sm font-semibold text-ink truncate">{v.title}</p>
                          <p className="text-xs text-ink3 truncate">{v.educator || v.author.name}</p>
                        </div>
                        {isStaff && (
                          <div className="flex shrink-0">
                            <button onClick={() => setEditor({ open: true, video: v })} className="p-1.5 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-elevated transition-colors" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteVideo(v)} className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* pagination — 6 per page */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink2 hover:bg-elevated disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${n === curPage ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink2 hover:bg-elevated disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )
      )}

      {/* ---- 1-on-1 Coaching ---- */}
      {tab === 'coaching' && (
        loadingOffers ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-surface rounded-xl border border-line animate-pulse" />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-surface rounded-xl border border-line p-12 text-center">
            <GraduationCap className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
            <p className="text-ink3">{isStaff ? 'No 1-on-1 offers yet — add the first one.' : 'No 1-on-1 coaching offers yet — check back soon.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map(o => (
              <div key={o.id} className="rounded-2xl border border-line bg-surface p-4 flex flex-col">
                <div className="flex items-start gap-3">
                  <Avatar src={o.coach.image} name={o.coach.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-ink truncate">{o.coach.name || 'Coach'}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 rounded px-1.5 py-0.5">
                        <GraduationCap className="w-3 h-3" /> 1-on-1
                      </span>
                    </div>
                    {o.coach.username && <p className="text-xs text-ink3 truncate">@{o.coach.username}</p>}
                  </div>
                  {isStaff && (
                    <div className="flex shrink-0">
                      <button onClick={() => setOfferEditor({ open: true, offer: o })} className="p-1.5 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-elevated transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteOffer(o)} className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Topic</p>
                  <p className="text-sm text-ink2 whitespace-pre-wrap leading-relaxed">{o.topic}</p>
                </div>
                {o.coverage && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Coverage</p>
                    <p className="text-sm text-ink2 whitespace-pre-wrap leading-relaxed">{o.coverage}</p>
                  </div>
                )}

                <p className="text-xs text-ink3 mt-3">💬 Pricing is sent by the coach via direct message.</p>

                <Link href={`/chat?dm=${o.coach.id}`}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500 text-black text-sm font-semibold px-4 py-2 hover:bg-yellow-400 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Message {o.coach.name?.split(' ')[0] || 'coach'}
                </Link>
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

      {editor.open && (
        <VideoEditor
          initial={editor.video}
          onClose={() => setEditor({ open: false, video: null })}
          onSaved={(v, isNew) => {
            setVideos(prev => isNew ? [v, ...prev] : prev.map(x => x.id === v.id ? v : x))
            setEditor({ open: false, video: null })
          }}
        />
      )}

      {offerEditor.open && (
        <CoachingEditor
          initial={offerEditor.offer}
          onClose={() => setOfferEditor({ open: false, offer: null })}
          onSaved={(o, isNew) => {
            setOffers(prev => isNew ? [o, ...prev] : prev.map(x => x.id === o.id ? o : x))
            setOfferEditor({ open: false, offer: null })
          }}
        />
      )}
    </div>
  )
}

/* ---- staff: add / edit 1-on-1 coaching offer ---- */
function CoachingEditor({ initial, onClose, onSaved }: { initial: CoachingOffer | null; onClose: () => void; onSaved: (o: CoachingOffer, isNew: boolean) => void }) {
  const [coaches, setCoaches] = useState<CoachLite[]>([])
  const [coachId, setCoachId] = useState(initial?.coach.id ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [coverage, setCoverage] = useState(initial?.coverage ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/chat/coaches').then(r => r.json()).then((d: CoachLite[]) => {
      if (!Array.isArray(d)) return
      // Editing keeps the current coach available even if the list excludes self.
      const list = initial && !d.some(c => c.id === initial.coach.id) ? [initial.coach, ...d] : d
      setCoaches(list)
      if (!initial && list[0]) setCoachId(prev => prev || list[0].id)
    }).catch(() => {})
  }, [initial])

  async function save() {
    if (!coachId) { setError('Please select a coach.'); return }
    if (!topic.trim()) { setError('Topic is required.'); return }
    setSaving(true)
    try {
      const res = await fetch(initial ? `/api/education/coaching/${initial.id}` : '/api/education/coaching', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId, topic, coverage }),
      })
      if (res.ok) onSaved(await res.json(), !initial)
      else setError((await res.json().catch(() => ({}))).error || 'Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">{initial ? 'Edit 1-on-1 offer' : 'Add 1-on-1 offer'}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Coach</label>
            <select value={coachId} onChange={e => setCoachId(e.target.value)} className={`${inputCls} mt-1 scheme-dark`}>
              <option value="" disabled>Select a coach…</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name || `@${c.username}` || 'Coach'}</option>)}
            </select>
            <p className="text-[10px] text-ink3 mt-1">Members message this coach to arrange the session and get pricing.</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Topic</label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4}
              placeholder={'What the sessions cover, e.g.\n1. Identify MSNR and supply/demand (Day 1–2)\n2. Using them with confluences (Day 3)'}
              className={`${inputCls} mt-1 resize-none leading-relaxed`} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Coverage (optional)</label>
            <textarea value={coverage} onChange={e => setCoverage(e.target.value)} rows={3}
              placeholder="Extra scope or schedule notes…"
              className={`${inputCls} mt-1 resize-none leading-relaxed`} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">{initial ? 'Save changes' : 'Add offer'}</Button>
        </div>
      </div>
    </div>
  )
}

/* ---- staff: add / edit educator video ---- */
function VideoEditor({ initial, onClose, onSaved }: { initial: Video | null; onClose: () => void; onSaved: (v: Video, isNew: boolean) => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [embedUrl, setEmbedUrl] = useState(initial?.embedUrl ?? '')
  const [educator, setEducator] = useState(initial?.educator ?? '')
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim() || !embedUrl.trim()) { setError('Title and video URL are required.'); return }
    setSaving(true)
    try {
      const res = await fetch(initial ? `/api/education/videos/${initial.id}` : '/api/education/videos', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, embedUrl, educator, category }),
      })
      if (res.ok) onSaved(await res.json(), !initial)
      else setError((await res.json().catch(() => ({}))).error || 'Failed to save video')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">{initial ? 'Edit video' : 'Add video'}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" className={inputCls} />
          <input value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Video URL (YouTube, Facebook, Vimeo)" className={inputCls} />
          <p className="text-[10px] text-ink3">YouTube is most reliable. Facebook videos must be set to <span className="text-ink2 font-semibold">Public</span> to embed, or they show a &ldquo;video may no longer exist&rdquo; error.</p>
          <input value={educator} onChange={e => setEducator(e.target.value)} placeholder="Educator name (optional)" className={inputCls} />
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} mt-1 scheme-dark`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">{initial ? 'Save changes' : 'Add video'}</Button>
        </div>
      </div>
    </div>
  )
}
