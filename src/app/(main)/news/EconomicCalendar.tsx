'use client'
import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { format, isToday, isSameDay } from 'date-fns'
import type { CalendarEvent } from './feed'

const IMPACT_STYLE: Record<CalendarEvent['impact'], { dot: string; label: string }> = {
  high:    { dot: 'bg-red-400',    label: 'High' },
  medium:  { dot: 'bg-orange-400', label: 'Medium' },
  low:     { dot: 'bg-yellow-500', label: 'Low' },
  holiday: { dot: 'bg-ink3/40',    label: 'Holiday' },
}

const IMPACT_FILTERS = ['all', 'high', 'medium', 'low'] as const

export function EconomicCalendar({ events }: { events: CalendarEvent[] }) {
  const [impact, setImpact] = useState<(typeof IMPACT_FILTERS)[number]>('all')
  const todayRef = useRef<HTMLDivElement>(null)

  // Timestamps render in the viewer's timezone, which the server can't know —
  // hold the first paint until mount so SSR and client markup agree.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  useEffect(() => {
    if (mounted) todayRef.current?.scrollIntoView({ block: 'center' })
  }, [mounted])

  const filtered = useMemo(
    () => events.filter(e => impact === 'all' || e.impact === impact),
    [events, impact],
  )

  // Group into local calendar days — UTC timestamps near midnight land on a
  // different day depending on the viewer's offset.
  const days = useMemo(() => {
    const out: { date: Date; items: CalendarEvent[] }[] = []
    for (const e of filtered) {
      const d = new Date(e.ts)
      const last = out[out.length - 1]
      if (last && isSameDay(last.date, d)) last.items.push(e)
      else out.push({ date: d, items: [e] })
    }
    return out
  }, [filtered])

  if (!mounted) {
    return <div className="bg-surface rounded-xl border border-line p-12 text-center text-sm text-ink3">Loading calendar…</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {IMPACT_FILTERS.map(f => (
          <button key={f} onClick={() => setImpact(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              impact === f ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'
            }`}>
            {f !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_STYLE[f].dot}`} />}
            {f === 'all' ? 'All Impact' : IMPACT_STYLE[f].label}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <p className="text-ink3 text-sm">No events match this filter.</p>
        </div>
      ) : (
        days.map(({ date, items }) => (
          <div
            key={date.toDateString()}
            ref={isToday(date) ? todayRef : undefined}
            className="bg-surface rounded-xl border border-line overflow-hidden"
          >
            <div className={`flex items-center gap-2 px-3 py-2 border-b border-line ${isToday(date) ? 'bg-yellow-500/[0.06]' : ''}`}>
              <h2 className={`text-xs font-bold uppercase tracking-wider ${isToday(date) ? 'text-yellow-500' : 'text-ink2'}`}>
                {format(date, 'EEEE, MMM d')}
              </h2>
              {isToday(date) && (
                <span className="text-[10px] font-bold text-black bg-yellow-500 rounded-full px-1.5">TODAY</span>
              )}
              <span className="ml-auto text-[10px] text-ink3">{items.length} {items.length === 1 ? 'event' : 'events'}</span>
              <div className="hidden sm:flex items-center gap-4 shrink-0 pl-2">
                <span className="w-16 text-right text-[10px] text-ink3 uppercase tracking-wider">Forecast</span>
                <span className="w-16 text-right text-[10px] text-ink3 uppercase tracking-wider">Previous</span>
                <span className="w-3" />
              </div>
            </div>

            <div className="divide-y divide-line">
              {items.map((e, i) => (
                <a
                  key={e.url + i}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-elevated transition-colors group"
                >
                  <span className="text-xs font-semibold text-ink2 tabular-nums w-14 sm:w-16 shrink-0">
                    {e.timed ? format(new Date(e.ts), 'h:mm a') : 'All Day'}
                  </span>

                  <span className="text-xs font-bold text-ink bg-sunken border border-line rounded px-1.5 py-0.5 w-12 text-center shrink-0">
                    {e.currency}
                  </span>

                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${IMPACT_STYLE[e.impact].dot}`}
                    title={`${IMPACT_STYLE[e.impact].label} impact`}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink font-medium truncate group-hover:text-yellow-500 transition-colors">
                      {e.title}
                    </span>
                    {(e.forecast || e.previous) && (
                      <span className="sm:hidden block text-[10px] text-ink3 tabular-nums mt-0.5">
                        {e.forecast && <>F: <span className="text-ink2">{e.forecast}</span></>}
                        {e.forecast && e.previous && <span className="mx-1.5">·</span>}
                        {e.previous && <>P: <span className="text-ink2">{e.previous}</span></>}
                      </span>
                    )}
                  </span>

                  <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs tabular-nums">
                    <span className="w-16 text-right">
                      <span className="text-ink3">{e.forecast || '—'}</span>
                    </span>
                    <span className="w-16 text-right text-ink3">{e.previous || '—'}</span>
                  </div>

                  <ExternalLink className="w-3 h-3 text-ink3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
