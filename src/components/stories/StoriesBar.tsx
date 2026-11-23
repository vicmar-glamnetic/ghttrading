'use client'
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { storyBackground, type StoryGroup, type StoryItem } from '@/lib/stories'
import { StoryComposer } from './StoryComposer'
import { StoryViewer } from './StoryViewer'

interface Me { id: string; name: string | null; image: string | null }

/**
 * Facebook-style story row at the top of the feed: "Create story" first, then
 * one tall card per person with a story up, unseen ones first.
 */
export function StoriesBar({ me }: { me: Me }) {
  const [groups, setGroups] = useState<StoryGroup[] | null>(null)
  const [composing, setComposing] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/stories', { cache: 'no-store' })
      if (!r.ok) { setGroups([]); return }
      const d = await r.json()
      setGroups(d.groups ?? [])
    } catch {
      setGroups([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Show the desktop scroll arrows only when there's more to see that way.
  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, groups])

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })

  // Local "seen" update so rings go grey as you watch, before the refetch.
  const markSeen = useCallback((storyId: string) => {
    setGroups(gs => gs?.map(g => {
      if (!g.stories.some(s => s.id === storyId)) return g
      const stories = g.stories.map(s => s.id === storyId ? { ...s, seen: true } : s)
      return { ...g, stories, allSeen: stories.every(s => s.seen) }
    }) ?? null)
  }, [])

  const mine = groups?.find(g => g.isMine)

  return (
    <div className="relative" aria-label="Stories">
      <div
        ref={scroller}
        onScroll={measure}
        className="flex gap-2 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory -mx-1 px-1 py-0.5"
      >
        {/* Create story */}
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="story-card group snap-start shrink-0 w-[108px] h-[188px] sm:w-[116px] sm:h-[200px] rounded-xl overflow-hidden border border-line bg-surface flex flex-col text-left"
        >
          <div className="relative h-[70%] w-full overflow-hidden bg-elevated">
            {me.image ? (
              <img src={me.image} alt="" className="story-media h-full w-full object-cover" />
            ) : (
              <div className="story-media h-full w-full grid place-items-center text-3xl font-black text-ink2" style={{ background: storyBackground('night') }}>
                {getInitials(me.name || 'You')}
              </div>
            )}
          </div>
          <div className="relative flex-1 grid place-items-end justify-center pb-2.5">
            <span className="absolute -top-[18px] left-1/2 -translate-x-1/2 grid place-items-center h-9 w-9 rounded-full bg-yellow-500 text-black border-4 border-[color:var(--c-surface)] shadow-lg">
              <Plus className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="text-xs font-semibold text-ink">Create story</span>
          </div>
        </button>

        {groups === null && [0, 1, 2, 3].map(i => (
          <div key={i} className="snap-start shrink-0 w-[108px] h-[188px] sm:w-[116px] sm:h-[200px] rounded-xl border border-line bg-surface animate-pulse" />
        ))}

        {groups?.map((g, i) => (
          <StoryCard key={g.author.id} group={g} onOpen={() => setViewing(i)} />
        ))}
      </div>

      {/* Desktop scroll arrows, like Facebook's */}
      {edges.left && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Earlier stories"
          className="hidden sm:grid absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-surface/95 border border-line text-ink shadow-xl hover:bg-elevated"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="More stories"
          className="hidden sm:grid absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-surface/95 border border-line text-ink shadow-xl hover:bg-elevated"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {composing && (
        <StoryComposer
          me={me}
          onClose={() => setComposing(false)}
          onPosted={() => { setComposing(false); load() }}
        />
      )}

      {viewing !== null && groups && groups[viewing] && (
        <StoryViewer
          groups={groups}
          startGroup={viewing}
          meId={me.id}
          onSeen={markSeen}
          onDeleted={load}
          onClose={() => { setViewing(null); load() }}
        />
      )}

      {/* Nothing up yet: a quiet nudge next to Create story */}
      {groups && groups.length === 0 && !mine && (
        <p className="sr-only">No stories yet. Be the first to share one.</p>
      )}
    </div>
  )
}

/** The cover for a person's card: their first unseen story, else their latest. */
function coverOf(g: StoryGroup): StoryItem {
  return g.stories.find(s => !s.seen) ?? g.stories[g.stories.length - 1]
}

function StoryCard({ group, onOpen }: { group: StoryGroup; onOpen: () => void }) {
  const cover = coverOf(group)
  const first = (group.author.name || 'Member').split(' ')[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="story-card group relative snap-start shrink-0 w-[108px] h-[188px] sm:w-[116px] sm:h-[200px] rounded-xl overflow-hidden border border-line bg-elevated text-left"
    >
      {cover.mediaUrl && cover.mediaType === 'image' && (
        <img src={cover.mediaUrl} alt="" className="story-media absolute inset-0 h-full w-full object-cover" />
      )}
      {cover.mediaUrl && cover.mediaType === 'video' && (
        <video src={`${cover.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="story-media absolute inset-0 h-full w-full object-cover" />
      )}
      {!cover.mediaUrl && (
        <div className="story-media absolute inset-0 grid place-items-center p-3 text-center" style={{ background: storyBackground(cover.bg) }}>
          <span className="line-clamp-5 text-[13px] font-bold leading-snug text-white drop-shadow">{cover.text}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />

      <span className={`absolute left-2 top-2 rounded-full p-[3px] ${group.allSeen ? 'bg-white/35' : 'story-ring'}`}>
        <span className="block h-9 w-9 overflow-hidden rounded-full border-2 border-black/40 bg-elevated">
          {group.author.image
            ? <img src={group.author.image} alt="" className="h-full w-full object-cover" />
            : <span className="grid h-full w-full place-items-center text-[11px] font-bold text-ink2">{getInitials(group.author.name || 'M')}</span>}
        </span>
      </span>

      {group.stories.length > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{group.stories.length}</span>
      )}

      <span className="absolute inset-x-2 bottom-2 text-xs font-semibold leading-tight text-white drop-shadow">
        {group.isMine ? 'Your story' : first}
      </span>
    </button>
  )
}
