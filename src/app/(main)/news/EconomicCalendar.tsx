'use client'
import { useState, useMemo, useEffect, useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { format, isToday, isSameDay, startOfDay, isBefore } from 'date-fns'
import type { CalendarEvent } from './feed'

// Hue alone can't carry a three-step ramp at this size, so high also gets a ring
// — the severity that matters most stays legible without any colour perception.
const IMPACT_STYLE: Record<CalendarEvent['impact'], { dot: string; label: string }> = {
  high:    { dot: 'impact-high ring-2 ring-red-500/25', label: 'High' },
  medium:  { dot: 'impact-medium',                      label: 'Medium' },
  low:     { dot: 'impact-low',                         label: 'Low' },
  holiday: { dot: 'bg-ink3/40',                         label: 'Holiday' },
}

const IMPACT_FILTERS = ['all', 'high', 'medium', 'low'] as const

// USD releases are scheduled in New York time — "8:30 ET" is how the desk and
// ForexFactory both quote them — so pair the viewer's own clock with ET.
const NY_ZONE = 'America/New_York'

const CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric', minute: '2-digit', hour12: true,
}
const nyClock = new Intl.DateTimeFormat('en-US', { ...CLOCK_OPTS, timeZone: NY_ZONE })
// Same formatter family as nyClock, so the comparison below isn't thrown off by
// ICU's narrow no-break space before AM/PM.
const localClock = new Intl.DateTimeFormat('en-US', CLOCK_OPTS)

// The feed pins All Day and Tentative events to UTC midnight, which falls on the
// previous local day for anyone west of Greenwich — a New York viewer would see
// Friday's holiday sitting under Thursday, and the "today or later" test would
// drop it a day early. Rebuild those on the calendar date the feed meant.
function eventDate(e: CalendarEvent) {
  const d = new Date(e.ts)
  return e.timed ? d : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// The viewer's zone as they'd recognise it: "Europe/London (GMT+1)".
function localZoneLabel() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const abbr = new Intl.DateTimeFormat([], { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value
  // A viewer on plain UTC would otherwise read "UTC (UTC)".
  return abbr && abbr !== zone ? `${zone} (${abbr})` : zone
}

export function EconomicCalendar({ events }: { events: CalendarEvent[] }) {
  const [impact, setImpact] = useState<(typeof IMPACT_FILTERS)[number]>('all')

  // Timestamps render in the viewer's timezone, which the server can't know —
  // hold the first paint until mount so SSR and client markup agree.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // Releases drop off the list as they happen, so a tab left open all session
  // doesn't keep showing news that's already priced in.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setNow(Date.now()) }, 60000)
    return () => clearInterval(id)
  }, [])

  const byImpact = useMemo(
    () => events.filter(e => impact === 'all' || e.impact === impact),
    [events, impact],
  )

  // The feed carries the whole current week; show all of it that's still ahead
  // and drop the days already behind us. All Day and Tentative events carry no
  // clock time — they'd read as "already past" the moment the day starts, so
  // they're judged by date instead.
  const filtered = useMemo(() => {
    const today = startOfDay(new Date(now))
    return byImpact.filter(e =>
      e.timed ? e.ts >= now : !isBefore(eventDate(e), today),
    )
  }, [byImpact, now])

  // Only worth a second column when the viewer isn't already on New York time —
  // compare rendered clocks, so Toronto (same offset, different zone name) also
  // counts as ET.
  const zone = useMemo(() => {
    if (!mounted) return { label: '', showNY: false }
    const now = new Date()
    return {
      label: localZoneLabel(),
      showNY: nyClock.format(now) !== localClock.format(now),
    }
  }, [mounted])

  // Group into local calendar days — UTC timestamps near midnight land on a
  // different day depending on the viewer's offset.
  const days = useMemo(() => {
    // Re-sort on the display date: a rebuilt All Day event no longer sits where
    // its raw UTC timestamp put it, and the grouping below assumes day order.
    const ordered = [...filtered].sort((a, b) => +eventDate(a) - +eventDate(b))
    const out: { date: Date; items: CalendarEvent[] }[] = []
    for (const e of ordered) {
      const d = eventDate(e)
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

      <p className="text-[10px] text-ink3">
        Times in <span className="text-ink2 font-semibold">{zone.label}</span>
        {zone.showNY && <> · second line is New York time (ET)</>}
      </p>

      {days.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <p className="text-ink3 text-sm">
            {impact === 'all'
              ? 'Nothing left on the calendar this week.'
              : 'No events match this filter for the rest of the week.'}
          </p>
        </div>
      ) : (
        days.map(({ date, items }) => (
          <div
            key={date.toDateString()}
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
                  <span className="w-16 sm:w-20 shrink-0">
                    <span className="block text-xs font-semibold text-ink2 tabular-nums">
                      {e.timed ? format(new Date(e.ts), 'h:mm a') : 'All Day'}
                    </span>
                    {e.timed && zone.showNY && (
                      <span className="block text-[10px] text-ink3 tabular-nums">
                        {nyClock.format(new Date(e.ts))} ET
                      </span>
                    )}
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
