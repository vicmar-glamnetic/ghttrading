'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Radio, WifiOff, X, Settings2 } from 'lucide-react'

interface Webinar { title: string | null; embedUrl: string | null; isLive: boolean }

// Normalise common video URLs to their embeddable form.
function toEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
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
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  const [webinar, setWebinar] = useState<Webinar>({ title: null, embedUrl: null, isLive: false })
  const [showSettings, setShowSettings] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/live')
      const data = await res.json()
      setWebinar(data.webinar ?? { title: null, embedUrl: null, isLive: false })
    } catch { /* ignore */ }
  }, [])
  useEffect(() => { load() }, [load])

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
        body: JSON.stringify({ title, embedUrl, isLive }),
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
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  )
}
