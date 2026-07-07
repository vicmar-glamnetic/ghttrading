'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Radio, Play, WifiOff, Plus, Trash2, X, Settings2 } from 'lucide-react'

interface Author { id: string; name: string | null; image: string | null; username: string | null }
interface Video { id: string; title: string; embedUrl: string; educator: string | null; author: Author }
interface Webinar { title: string | null; embedUrl: string | null; isLive: boolean }

type Tab = 'live' | 'videos'

// Normalise common video URLs to their embeddable form.
function toEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.hostname.includes('vimeo.com') && /^\/\d+/.test(u.pathname)) {
      return `https://player.vimeo.com/video${u.pathname}`
    }
    return url
  } catch {
    return url
  }
}

export default function LivePage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isStaff = role === 'admin' || role === 'coach'

  const [tab, setTab] = useState<Tab>('live')
  const [webinar, setWebinar] = useState<Webinar>({ title: null, embedUrl: null, isLive: false })
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/live')
      const data = await res.json()
      setWebinar(data.webinar ?? { title: null, embedUrl: null, isLive: false })
      setVideos(data.videos ?? [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function deleteVideo(v: Video) {
    if (!confirm(`Delete "${v.title}"?`)) return
    setVideos(prev => prev.filter(x => x.id !== v.id))
    await fetch(`/api/live/videos/${v.id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">
          GHT Live
        </h1>
        <p className="text-ink2 text-sm mt-2 max-w-xl mx-auto">
          Latest videos from our educators. Watch, learn, and stay ahead of the market.
        </p>
      </div>

      {/* tabs */}
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => setTab('live')}
          className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'live' ? 'text-ink border-yellow-500' : 'text-ink3 border-transparent hover:text-ink2'}`}>
          <Radio className="w-4 h-4" /> Live Webinar
          {webinar.isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        </button>
        <button onClick={() => setTab('videos')}
          className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'videos' ? 'text-ink border-yellow-500' : 'text-ink3 border-transparent hover:text-ink2'}`}>
          <Play className="w-4 h-4" /> Educators Videos
        </button>
      </div>

      {/* ---- Live Webinar ---- */}
      {tab === 'live' && (
        <div className="space-y-3">
          {isStaff && (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5 text-xs">
                <Settings2 className="w-3.5 h-3.5" /> Manage stream
              </Button>
            </div>
          )}
          <div className="rounded-2xl border border-line bg-surface overflow-hidden aspect-video">
            {webinar.isLive && webinar.embedUrl ? (
              <iframe
                src={toEmbed(webinar.embedUrl)}
                title={webinar.title || 'Live webinar'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                <WifiOff className="w-12 h-12 text-yellow-500/50 mb-3" />
                <p className="text-lg font-semibold text-ink2">We&apos;re offline right now.</p>
                <p className="text-sm text-ink3 mt-1">The live webinar isn&apos;t streaming at the moment — check back soon.</p>
              </div>
            )}
          </div>
          {webinar.isLive && webinar.title && (
            <p className="text-center text-sm font-semibold text-ink">{webinar.title}</p>
          )}
        </div>
      )}

      {/* ---- Educators Videos ---- */}
      {tab === 'videos' && (
        <div className="space-y-4">
          {isStaff && (
            <div className="flex justify-end">
              <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add video
              </Button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="aspect-video bg-surface rounded-xl border border-line animate-pulse" />)}
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line p-12 text-center">
              <Play className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
              <p className="text-ink3">No educator videos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos.map(v => (
                <div key={v.id} className="rounded-2xl border border-line bg-surface overflow-hidden group">
                  <div className="aspect-video bg-black">
                    <iframe
                      src={toEmbed(v.embedUrl)}
                      title={v.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
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
          )}
        </div>
      )}

      {showSettings && (
        <WebinarSettings
          initial={webinar}
          onClose={() => setShowSettings(false)}
          onSaved={w => { setWebinar(w); setShowSettings(false) }}
        />
      )}
      {showAdd && (
        <AddVideo
          onClose={() => setShowAdd(false)}
          onAdded={v => { setVideos(prev => [v, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

/* ---- staff: manage live stream ---- */
function WebinarSettings({ initial, onClose, onSaved }: { initial: Webinar; onClose: () => void; onSaved: (w: Webinar) => void }) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [embedUrl, setEmbedUrl] = useState(initial.embedUrl ?? '')
  const [isLive, setIsLive] = useState(initial.isLive)
  const [saving, setSaving] = useState(false)

  async function save(goLive?: boolean) {
    const live = goLive ?? isLive
    setSaving(true)
    try {
      const res = await fetch('/api/live/webinar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, embedUrl, isLive: live }),
      })
      if (res.ok) onSaved(await res.json())
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">Manage live stream</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Webinar title" className={inputCls} />
          <input value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Stream URL (YouTube, Vimeo, etc.)" className={inputCls} />
          <p className="text-[10px] text-ink3">Paste a YouTube/Vimeo link or any embeddable stream URL. Toggle live when you start.</p>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={isLive} onChange={e => setIsLive(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
            Currently live
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={() => save()} loading={saving} className="flex-1">Save</Button>
        </div>
      </div>
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
      const res = await fetch('/api/live/videos', {
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
          <h2 className="font-bold text-ink">Add educator video</h2>
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
