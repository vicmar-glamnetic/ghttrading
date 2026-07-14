'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Radio, WifiOff, X, Settings2, Trash2, Video, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import { toEmbed } from '@/lib/video'
import { LiveRoom, type LiveRoomProps } from '@/components/LiveRoom'

type LiveMode = 'webinar' | 'room'
interface Webinar { title: string | null; embedUrl: string | null; isLive: boolean; mode: LiveMode; roomName: string | null }

export default function LivePage() {
  const { data: session } = useSession()
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  const [webinar, setWebinar] = useState<Webinar>({ title: null, embedUrl: null, isLive: false, mode: 'webinar', roomName: null })
  const [showSettings, setShowSettings] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [room, setRoom] = useState<LiveRoomProps | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/live')
      const data = await res.json()
      setWebinar(data.webinar ?? { title: null, embedUrl: null, isLive: false, mode: 'webinar', roomName: null })
    } catch { /* ignore */ }
  }, [])
  useEffect(() => { load() }, [load])

  // For an interactive room, fetch the per-user room config (signed with
  // moderator rights for staff when JaaS is configured).
  useEffect(() => {
    let alive = true
    if (webinar.isLive && webinar.mode === 'room' && webinar.roomName) {
      fetch('/api/live/token')
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (alive) setRoom(d?.roomName ? (d as LiveRoomProps) : null) })
        .catch(() => { if (alive) setRoom(null) })
    } else {
      setRoom(null)
    }
    return () => { alive = false }
  }, [webinar.isLive, webinar.mode, webinar.roomName])

  // While expanded, the live area fills the viewport — lock page scroll and let Escape close it.
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  const removeLive = useCallback(async () => {
    if (!confirm('Remove the live stream? This takes it offline for everyone.')) return
    setRemoving(true)
    try {
      const res = await fetch('/api/live/webinar', { method: 'DELETE' })
      if (res.ok) setWebinar(await res.json())
    } finally {
      setRemoving(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide flex items-center justify-center gap-2">
          <Radio className="w-6 h-6 text-yellow-500" /> GHT Live
        </h1>
        <p className="text-ink2 text-sm mt-2 max-w-xl mx-auto">
          Join our live trading webinars. Watch, learn, and trade alongside our coaches.
        </p>
      </div>

      {isStaff && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5 text-xs">
            <Settings2 className="w-3.5 h-3.5" /> Manage stream
          </Button>
          {(webinar.isLive || webinar.embedUrl || webinar.title) && (
            <Button variant="secondary" size="sm" onClick={removeLive} loading={removing}
              className="gap-1.5 text-xs text-red-400 hover:text-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Remove live
            </Button>
          )}
        </div>
      )}

      <div
        className={
          expanded
            ? 'fixed inset-0 z-90 bg-black'
            : 'relative rounded-2xl border border-line bg-surface overflow-hidden aspect-video'
        }
      >
        {webinar.isLive && webinar.mode === 'room' && webinar.roomName ? (
          room ? (
            <LiveRoom {...room} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
              <Loader2 className="w-8 h-8 text-yellow-500/60 mb-3 animate-spin" />
              <p className="text-sm text-ink2">Connecting to the live room…</p>
            </div>
          )
        ) : webinar.isLive && webinar.mode === 'webinar' && webinar.embedUrl ? (
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
            <p className="text-sm text-ink3 mt-1">No live session at the moment — check back soon.</p>
          </div>
        )}

        {/* Expand to fill the screen — lets mobile members watch large in portrait or rotate to landscape. */}
        {webinar.isLive && (webinar.embedUrl || webinar.roomName) && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Exit full screen' : 'Full screen'}
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/55 backdrop-blur px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black/75 transition"
            style={expanded ? { top: 'max(0.5rem, env(safe-area-inset-top))', right: 'max(0.5rem, env(safe-area-inset-right))' } : undefined}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{expanded ? 'Exit' : 'Full screen'}</span>
          </button>
        )}
      </div>
      {webinar.isLive && webinar.title && (
        <p className="text-center text-sm font-semibold text-ink">{webinar.title}</p>
      )}

      {showSettings && (
        <WebinarSettings
          initial={webinar}
          onClose={() => setShowSettings(false)}
          onSaved={w => { setWebinar(w); setShowSettings(false) }}
        />
      )}
    </div>
  )
}

/* ---- staff: manage live stream ---- */
function WebinarSettings({ initial, onClose, onSaved }: { initial: Webinar; onClose: () => void; onSaved: (w: Webinar) => void }) {
  const [mode, setMode] = useState<LiveMode>(initial.mode ?? 'webinar')
  const [title, setTitle] = useState(initial.title ?? '')
  const [embedUrl, setEmbedUrl] = useState(initial.embedUrl ?? '')
  const [isLive, setIsLive] = useState(initial.isLive)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/live/webinar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, embedUrl, isLive, mode }),
      })
      if (res.ok) onSaved(await res.json())
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'
  const tabCls = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition ${
      active ? 'bg-yellow-500/10 border-yellow-500/40 text-ink' : 'bg-sunken border-line text-ink3 hover:text-ink2'
    }`

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">Manage live session</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('webinar')} className={tabCls(mode === 'webinar')}>
              <Radio className="w-3.5 h-3.5" /> Webinar
            </button>
            <button type="button" onClick={() => setMode('room')} className={tabCls(mode === 'room')}>
              <Video className="w-3.5 h-3.5" /> Live room
            </button>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title" className={inputCls} />
          {mode === 'webinar' ? (
            <>
              <input value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Stream URL (YouTube, Facebook Live, Vimeo…)" className={inputCls} />
              <p className="text-[10px] text-ink3">Paste a YouTube, Facebook Live, or Vimeo link. Facebook videos must be set to <span className="text-ink2 font-semibold">Public</span> to embed. Toggle live when you start.</p>
            </>
          ) : (
            <p className="text-[10px] text-ink3">A free <span className="text-ink2 font-semibold">Jitsi</span> video room where <span className="text-ink2 font-semibold">coaches present</span> and members watch + chat (members can&apos;t speak). Toggle live to open it — a private room is created automatically.</p>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={isLive} onChange={e => setIsLive(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
            Currently live
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  )
}
