'use client'
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Pause, Play, Volume2, VolumeX, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { getInitials, timeAgo } from '@/lib/utils'
import { STORY_IMAGE_MS, STORY_VIDEO_MAX_MS, storyBackground, type StoryGroup } from '@/lib/stories'
import { useSession } from 'next-auth/react'
import { REACTIONS, getReaction } from '@/lib/reactions'

interface Viewer { id: string; name: string | null; image: string | null; at: string; reaction?: string | null }

/**
 * Full-screen story player: segmented progress bars, tap right for next and
 * left for back, hold to pause, auto-advance to the next person, Esc to close.
 * On your own stories, "Seen by" lists who watched.
 */
export function StoryViewer({ groups, startGroup, meId, onSeen, onDeleted, onClose }: {
  groups: StoryGroup[]
  startGroup: number
  meId: string
  onSeen: (storyId: string) => void
  onDeleted: () => void
  onClose: () => void
}) {
  const { data: session } = useSession()
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  // Start each person at their first unseen story, like Facebook.
  const firstUnseen = (gi: number) => Math.max(0, groups[gi]?.stories.findIndex(s => !s.seen) ?? 0)
  const [gi, setGi] = useState(startGroup)
  const [si, setSi] = useState(() => firstUnseen(startGroup))
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [viewers, setViewers] = useState<Viewer[] | null>(null)
  const [showViewers, setShowViewers] = useState(false)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  // Reactions changed while the viewer is open (the list reloads on close).
  const [myReactions, setMyReactions] = useState<Record<string, string | null>>({})
  const [burst, setBurst] = useState<{ key: number; emoji: string } | null>(null)
  const burstKey = useRef(0)

  const group = groups[gi]
  const stories = group?.stories.filter(s => !removed.has(s.id)) ?? []
  const story = stories[Math.min(si, stories.length - 1)]
  const isMine = group?.author.id === meId

  const videoRef = useRef<HTMLVideoElement>(null)
  const pressAt = useRef(0)
  const elapsed = useRef(0)

  const next = useCallback(() => {
    setProgress(0); elapsed.current = 0
    if (si < stories.length - 1) { setSi(si + 1); return }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(firstUnseen(gi + 1)); return }
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, gi, stories.length, groups.length, onClose])

  const prev = useCallback(() => {
    setProgress(0); elapsed.current = 0
    if (si > 0) { setSi(si - 1); return }
    if (gi > 0) { setGi(gi - 1); setSi(0); return }
  }, [si, gi])

  // Mark seen when a story comes up.
  useEffect(() => {
    if (!story || isMine || story.seen) return
    fetch(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => {})
    onSeen(story.id)
  }, [story, isMine, onSeen])

  // Reset per story.
  useEffect(() => {
    setShowViewers(false)
    setViewers(null)
    elapsed.current = 0
    setProgress(0)
  }, [story?.id])

  // Photo / text timer. Videos drive progress from their own currentTime.
  useEffect(() => {
    if (!story || story.mediaType === 'video' || paused || showViewers) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      elapsed.current += t - last
      last = t
      const p = Math.min(1, elapsed.current / STORY_IMAGE_MS)
      setProgress(p)
      if (p >= 1) { next(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [story, paused, showViewers, next])

  // Play / pause the video with the viewer.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused || showViewers) v.pause()
    else v.play().catch(() => { /* autoplay with sound blocked: stay muted */ setMuted(true) })
  }, [paused, showViewers, story?.id])

  // Keyboard: arrows, space, escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  // Lock page scroll underneath.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  async function openViewers() {
    if (!story) return
    setShowViewers(true)
    try {
      const r = await fetch(`/api/stories/${story.id}/viewers`)
      const d = await r.json()
      setViewers(d.viewers ?? [])
    } catch {
      setViewers([])
    }
  }

  async function remove() {
    if (!story) return
    setPaused(true)
    const r = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' }).catch(() => null)
    if (!r?.ok) { setPaused(false); return }
    const id = story.id
    setRemoved(s => new Set(s).add(id))
    onDeleted()
    setPaused(false)
    if (stories.length <= 1) {
      if (gi < groups.length - 1) { setGi(gi + 1); setSi(firstUnseen(gi + 1)) } else onClose()
    } else if (si >= stories.length - 1) setSi(Math.max(0, si - 1))
  }

  async function react(type: string) {
    if (!story) return
    const id = story.id
    const prevReaction = id in myReactions ? myReactions[id] : story.myReaction ?? null
    const nextReaction = prevReaction === type ? null : type
    setMyReactions(m => ({ ...m, [id]: nextReaction }))
    if (nextReaction) setBurst({ key: ++burstKey.current, emoji: getReaction(nextReaction).emoji })
    const r = await fetch(`/api/stories/${id}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
    }).catch(() => null)
    if (!r?.ok) setMyReactions(m => ({ ...m, [id]: prevReaction }))
  }

  if (!group || !story) return null
  const myReaction = story.id in myReactions ? myReactions[story.id] : story.myReaction ?? null

  // Tap: left third goes back, the rest goes forward. A long press only pauses.
  const onPointerDown = () => { pressAt.current = Date.now(); setPaused(true) }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const held = Date.now() - pressAt.current > 220
    setPaused(false)
    if (held) return
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX - r.left < r.width / 3) prev(); else next()
  }

  return (
    <div className="story-viewer fixed inset-0 z-[200] bg-black/95 flex items-center justify-center">
      {/* Blurred backdrop of the current story on wide screens */}
      {story.mediaUrl && story.mediaType === 'image' && (
        <img src={story.mediaUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 blur-3xl scale-110" />
      )}

      <button type="button" onClick={onClose} aria-label="Close stories" className="absolute right-3 top-3 z-20 hidden sm:grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>

      {/* Previous / next person (desktop) */}
      {(gi > 0 || si > 0) && (
        <button type="button" onClick={prev} aria-label="Previous" className="absolute left-[calc(50%-17rem)] z-20 hidden md:grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black shadow-xl hover:bg-white">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <button type="button" onClick={next} aria-label="Next" className="absolute right-[calc(50%-17rem)] z-20 hidden md:grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black shadow-xl hover:bg-white">
        <ChevronRight className="h-6 w-6" />
      </button>

      <div key={`${group.author.id}-${story.id}`} className="story-frame relative h-full w-full sm:h-[92vh] sm:w-auto sm:aspect-[9/16] sm:rounded-2xl overflow-hidden bg-black shadow-2xl">
        {/* Media */}
        {story.mediaUrl && story.mediaType === 'image' && (
          <img src={story.mediaUrl} alt={story.text || `${group.author.name}'s story`} className="absolute inset-0 h-full w-full object-contain" />
        )}
        {story.mediaUrl && story.mediaType === 'video' && (
          <video
            ref={videoRef}
            src={story.mediaUrl}
            autoPlay
            playsInline
            muted={muted}
            className="absolute inset-0 h-full w-full object-contain"
            onTimeUpdate={e => {
              const v = e.currentTarget
              const dur = Math.min(v.duration || 0, STORY_VIDEO_MAX_MS / 1000)
              if (!dur) return
              const p = Math.min(1, v.currentTime / dur)
              setProgress(p)
              if (p >= 1) next()
            }}
            onEnded={next}
          />
        )}
        {!story.mediaUrl && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center" style={{ background: storyBackground(story.bg) }}>
            <p className="text-2xl sm:text-3xl font-black leading-snug text-white drop-shadow-lg whitespace-pre-wrap break-words">{story.text}</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Tap zones */}
        <div
          className="absolute inset-0 z-[1] select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setPaused(false)}
          onContextMenu={e => e.preventDefault()}
        />

        {/* Progress bars */}
        <div className="absolute inset-x-2 top-2 z-10 flex gap-1" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
          {stories.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
              <span
                className="block h-full rounded-full bg-white"
                style={{ width: `${i < si ? 100 : i === si ? progress * 100 : 0}%` }}
              />
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-3 top-5 z-10 flex items-center gap-2" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
          <Link href={`/profile/${group.author.id}`} onClick={onClose} className="flex min-w-0 items-center gap-2">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-elevated">
              {group.author.image
                ? <img src={group.author.image} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center text-xs font-bold text-ink2">{getInitials(group.author.name || 'M')}</span>}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{isMine ? 'Your story' : group.author.name || 'Member'}</span>
              <span className="block text-[11px] text-white/75">{timeAgo(story.createdAt)}</span>
            </span>
          </Link>
          <span className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Play' : 'Pause'} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15">
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            {story.mediaType === 'video' && (
              <button type="button" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15">
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            {(isMine || isStaff) && (
              <button type="button" onClick={remove} aria-label="Delete story" className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15 sm:hidden">
              <X className="h-5 w-5" />
            </button>
          </span>
        </div>

        {/* Caption on media stories */}
        {story.mediaUrl && story.text && (
          <p className={`absolute inset-x-4 ${isMine ? 'bottom-20' : 'bottom-24'} z-10 mx-auto max-w-sm rounded-lg bg-black/55 px-3 py-2 text-center text-sm font-semibold text-white`}>{story.text}</p>
        )}

        {/* Reactions (someone else's story) */}
        {!isMine && (
          <div
            className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div role="group" aria-label="React to this story" className="flex items-center gap-0.5 rounded-full bg-black/55 px-2 py-1.5 backdrop-blur-sm">
              {REACTIONS.map(r => (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => react(r.type)}
                  aria-label={r.label}
                  aria-pressed={myReaction === r.type}
                  title={r.label}
                  className={`grid h-9 w-9 place-items-center rounded-full text-2xl leading-none transition-transform hover:scale-125 ${myReaction === r.type ? 'bg-white/25 scale-110' : ''}`}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The reaction you just sent floats up */}
        {burst && (
          <span key={burst.key} aria-hidden onAnimationEnd={() => setBurst(null)}
            className="story-react-burst pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 text-6xl">
            {burst.emoji}
          </span>
        )}

        {/* Seen by (your own stories) */}
        {isMine && (
          <button
            type="button"
            onClick={openViewers}
            className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <Eye className="h-4 w-4" /> {story.viewCount ?? 0} {story.viewCount === 1 ? 'viewer' : 'viewers'}
          </button>
        )}

        {showViewers && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-2xl bg-surface p-4 sheet-panel">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Seen by</p>
              <button type="button" onClick={() => setShowViewers(false)} aria-label="Close viewers" className="rounded-lg p-1 text-ink3 hover:bg-elevated hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewers === null ? (
              <p className="py-4 text-center text-xs text-ink3">Loading…</p>
            ) : viewers.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink3">No one yet. Check back soon.</p>
            ) : (
              <ul className="space-y-2.5">
                {viewers.map(v => (
                  <li key={v.id} className="flex items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-elevated">
                      {v.image ? <img src={v.image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-[10px] font-bold text-ink2">{getInitials(v.name || 'M')}</span>}
                    </span>
                    <Link href={`/profile/${v.id}`} onClick={onClose} className="min-w-0 flex-1 truncate text-sm text-ink hover:text-yellow-500">{v.name || 'Member'}</Link>
                    {v.reaction && <span className="text-lg leading-none" title={getReaction(v.reaction).label}>{getReaction(v.reaction).emoji}</span>}
                    <span className="text-[11px] text-ink3">{timeAgo(v.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
