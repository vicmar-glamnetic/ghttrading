'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import { X, ImageIcon, Type, Loader2, ArrowLeft } from 'lucide-react'
import { friendlyUploadError, uploadToBlob, validateImage } from '@/lib/upload'
import { STORY_BACKGROUNDS, STORY_TEXT_MAX, DEFAULT_STORY_BG, storyBackground } from '@/lib/stories'

const VIDEO_MAX_MB = 60

type Mode = 'pick' | 'media' | 'text'

/**
 * Create a story, Facebook style: pick "Photo / video" or "Text", see it in
 * a phone-shaped preview, then Share.
 */
export function StoryComposer({ me, onClose, onPosted }: {
  me: { name: string | null }
  onClose: () => void
  onPosted: () => void
}) {
  const [mode, setMode] = useState<Mode>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [bg, setBg] = useState(DEFAULT_STORY_BG)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const isVideo = !!file && file.type.startsWith('video/')

  function pickFile(f: File | undefined) {
    if (!f) return
    setError('')
    if (f.type.startsWith('video/')) {
      if (f.size > VIDEO_MAX_MB * 1024 * 1024) { setError(`That video is too big — keep it under ${VIDEO_MAX_MB}MB.`); return }
    } else {
      const bad = validateImage(f)
      if (bad) { setError(bad); return }
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMode('media')
  }

  async function share() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      let mediaUrl: string | undefined
      let mediaType: 'image' | 'video' | undefined
      if (mode === 'media' && file) {
        const up = await uploadToBlob(file)
        mediaUrl = up.url
        mediaType = isVideo ? 'video' : 'image'
      }
      const r = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl, mediaType, text, bg: mode === 'text' ? bg : undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not share your story.')
      onPosted()
    } catch (e) {
      setError(e instanceof Error && !/blob|token/i.test(e.message) ? e.message : friendlyUploadError(e))
      setBusy(false)
    }
  }

  const canShare = mode === 'media' ? !!file : mode === 'text' ? text.trim().length > 0 : false

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full sm:max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          {mode !== 'pick' && (
            <button type="button" onClick={() => { setMode('pick'); setError('') }} disabled={busy} className="p-1 -ml-1 rounded-lg text-ink3 hover:text-ink hover:bg-elevated" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="font-bold text-ink">Create story</h2>
          <button type="button" onClick={onClose} disabled={busy} className="ml-auto p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-elevated" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }}
        />

        {mode === 'pick' && (
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="story-pick relative h-56 rounded-xl overflow-hidden text-white grid place-items-center"
              style={{ background: storyBackground('gold') }}
            >
              <span className="flex flex-col items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-yellow-700 shadow-lg"><ImageIcon className="h-6 w-6" /></span>
                <span className="text-sm font-bold">Photo / video</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className="story-pick relative h-56 rounded-xl overflow-hidden text-white grid place-items-center"
              style={{ background: storyBackground('heist') }}
            >
              <span className="flex flex-col items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-yellow-700 shadow-lg"><Type className="h-6 w-6" /></span>
                <span className="text-sm font-bold">Text</span>
              </span>
            </button>
          </div>
        )}

        {mode !== 'pick' && (
          <div className="p-4 space-y-3">
            {/* Phone-shaped preview */}
            <div className="relative mx-auto aspect-[9/16] h-[52vh] max-h-[460px] rounded-xl overflow-hidden bg-black border border-line">
              {mode === 'media' && preview && (isVideo
                ? <video src={preview} autoPlay muted loop playsInline className="h-full w-full object-contain" />
                : <img src={preview} alt="Story preview" className="h-full w-full object-contain" />)}
              {mode === 'media' && text.trim() && (
                <p className="absolute inset-x-3 bottom-6 rounded-lg bg-black/55 px-3 py-2 text-center text-sm font-semibold text-white">{text}</p>
              )}
              {mode === 'text' && (
                <div className="h-full w-full grid place-items-center p-6" style={{ background: storyBackground(bg) }}>
                  <textarea
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, STORY_TEXT_MAX))}
                    placeholder="Start typing"
                    rows={5}
                    className="w-full resize-none bg-transparent text-center text-2xl font-black leading-snug text-white placeholder:text-white/60 outline-none drop-shadow"
                  />
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white">{me.name || 'You'}</span>
            </div>

            {mode === 'text' && (
              <div className="flex items-center justify-center gap-2">
                {Object.keys(STORY_BACKGROUNDS).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setBg(k)}
                    aria-label={`Background ${k}`}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${bg === k ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                    style={{ background: storyBackground(k) }}
                  />
                ))}
              </div>
            )}

            {mode === 'media' && (
              <input
                value={text}
                onChange={e => setText(e.target.value.slice(0, STORY_TEXT_MAX))}
                placeholder="Add a caption (optional)"
                className="w-full rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/50"
              />
            )}

            <p className="text-[11px] text-ink3 text-center">Everyone in the community can see your story for 24 hours.</p>
          </div>
        )}

        {error && <p className="px-4 pb-2 text-sm text-red-400">{error}</p>}

        {mode !== 'pick' && (
          <div className="flex gap-2 px-4 pb-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-4">
            {mode === 'media' && (
              <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-ink2 hover:bg-elevated">
                Change
              </button>
            )}
            <button
              type="button"
              onClick={share}
              disabled={!canShare || busy}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Sharing…' : 'Share to story'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
