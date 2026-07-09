'use client'
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

// Forex session hours in UTC (approx, standard time). Gold moves hardest on the
// London/New York overlap.
const SESSIONS = [
  { name: 'Sydney', start: 22, end: 7 },
  { name: 'Tokyo', start: 0, end: 9 },
  { name: 'London', start: 8, end: 17 },
  { name: 'New York', start: 13, end: 22 },
]

function isOpen(nowMin: number, start: number, end: number) {
  const s = start * 60, e = end * 60
  return s < e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e
}

// Minutes from now until the session's next state change (open↔close).
function minsToChange(nowMin: number, start: number, end: number, open: boolean) {
  const target = (open ? end : start) * 60
  let d = target - nowMin
  if (d <= 0) d += 24 * 60
  return d
}

function fmtDur(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Convert a UTC hour to the viewer's local "h:00" label.
function localHour(utcHour: number) {
  const d = new Date()
  d.setUTCHours(utcHour, 0, 0, 0)
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(':00', '')
}

export function SessionsClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => { if (!document.hidden) setNow(new Date()) }, 30000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  const rows = SESSIONS.map(s => {
    const open = isOpen(nowMin, s.start, s.end)
    return { ...s, open, mins: minsToChange(nowMin, s.start, s.end, open) }
  })
  const london = rows.find(r => r.name === 'London')!
  const ny = rows.find(r => r.name === 'New York')!
  const overlap = london.open && ny.open

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
        <Clock className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Market Sessions</span>
      </div>
      <div className="p-3 space-y-2">
        {rows.map(r => (
          <div key={r.name} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${r.open ? 'bg-green-400' : 'bg-ink3/40'}`} />
            <span className="text-xs font-semibold text-ink w-16 shrink-0">{r.name}</span>
            <span className="text-[10px] text-ink3">{localHour(r.start)}–{localHour(r.end)}</span>
            <span className={`ml-auto text-[10px] tabular-nums ${r.open ? 'text-green-400' : 'text-ink3'}`}>
              {r.open ? `closes ${fmtDur(r.mins)}` : `opens ${fmtDur(r.mins)}`}
            </span>
          </div>
        ))}
        {overlap && (
          <p className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 rounded px-2 py-1 text-center">
            🔥 London/NY overlap — peak gold volatility
          </p>
        )}
      </div>
    </div>
  )
}
