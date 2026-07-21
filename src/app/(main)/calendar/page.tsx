'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, NotebookPen, Flame } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isSameDay, isToday, isFuture,
} from 'date-fns'
import { journalingStreak } from '@/lib/journalTemplates'

interface JournalEntry {
  id: string
  title: string | null
  content: string
  mood: string | null
  symbol: string | null
  direction: string | null
  result: string | null
  pnl: number | null
  tradedAt: string | null
  createdAt: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function entryDate(e: JournalEntry) {
  return new Date(e.tradedAt ?? e.createdAt)
}

function fmtMoney(n: number, withSign = true) {
  const sign = n < 0 ? '-' : withSign ? '+' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/journal')
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Group entries by yyyy-MM-dd
  const byDay = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
    for (const e of entries) {
      const key = format(entryDate(e), 'yyyy-MM-dd')
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    return map
  }, [entries])

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month))
    const gridEnd = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [month])

  // Month-level stats
  const stats = useMemo(() => {
    const monthEntries = entries.filter(e => isSameMonth(entryDate(e), month))
    const net = monthEntries.reduce((s, e) => s + (e.pnl ?? 0), 0)
    const wins = monthEntries.filter(e => e.result === 'win').length
    const losses = monthEntries.filter(e => e.result === 'loss').length
    const decided = wins + losses
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null
    const trades = monthEntries.filter(e => e.symbol || e.direction || e.result || e.pnl != null).length
    return { net, wins, losses, winRate, trades, count: monthEntries.length }
  }, [entries, month])

  // Journaling-consistency heatmap (#8): the last ~17 weeks as a GitHub-style
  // grid — filled squares are days journaled, empty ones nag you to fill them.
  const WEEKS = 17
  const heatmap = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      const k = format(entryDate(e), 'yyyy-MM-dd')
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    const end = endOfWeek(new Date())
    const start = startOfWeek(new Date(end.getTime() - (WEEKS * 7 - 1) * 86400000))
    const allDays = eachDayOfInterval({ start, end })
    const weeks: { date: Date; count: number }[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7).map(date => ({ date, count: counts.get(format(date, 'yyyy-MM-dd')) ?? 0 })))
    }
    return weeks
  }, [entries])

  const streak = useMemo(() => journalingStreak(entries.map(entryDate)), [entries])
  const journaledDays = useMemo(() => new Set(entries.map(e => format(entryDate(e), 'yyyy-MM-dd'))).size, [entries])

  function heatCell(count: number) {
    if (count <= 0) return 'bg-elevated border border-line'
    if (count === 1) return 'bg-orange-500/30'
    if (count === 2) return 'bg-orange-500/60'
    return 'bg-orange-500'
  }

  function dayPnl(date: Date) {
    const list = byDay.get(format(date, 'yyyy-MM-dd'))
    if (!list) return null
    const withPnl = list.filter(e => e.pnl != null)
    if (withPnl.length === 0) return null
    return withPnl.reduce((s, e) => s + (e.pnl ?? 0), 0)
  }

  const selectedEntries = selectedDay ? (byDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">Trading Calendar</h1>
        </div>
        <Link href="/journal" className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
          <NotebookPen className="w-3.5 h-3.5" /> Log a trade
        </Link>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Net P&L', value: fmtMoney(stats.net), icon: stats.net >= 0 ? TrendingUp : TrendingDown, color: stats.net >= 0 ? 'text-green-400' : 'text-red-400', bg: stats.net >= 0 ? 'bg-green-400/10 border-green-400/20' : 'bg-red-400/10 border-red-400/20' },
          { label: 'Win Rate', value: stats.winRate == null ? '—' : `${stats.winRate}%`, icon: Target, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Wins', value: String(stats.wins), icon: TrendingUp, color: 'text-green-400', bg: 'bg-surface border-line' },
          { label: 'Losses', value: String(stats.losses), icon: TrendingDown, color: 'text-red-400', bg: 'bg-surface border-line' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 ${bg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-ink3 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Journaling consistency heatmap */}
      <div className="bg-surface rounded-xl border border-line p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-bold text-ink text-sm flex items-center gap-1.5">
            <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-400 fill-orange-400' : 'text-ink3'}`} />
            Journaling consistency
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-ink3">
            {streak > 0 && <span className="text-orange-400 font-bold">{streak}-day streak</span>}
            <span>{journaledDays} days journaled</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(({ date, count }) => (
                  <div
                    key={date.toISOString()}
                    title={`${format(date, 'EEE, MMM d')} — ${count ? `${count} ${count === 1 ? 'entry' : 'entries'}` : 'no entry'}`}
                    className={`w-3 h-3 rounded-sm ${isFuture(date) ? 'opacity-0' : heatCell(count)} ${isToday(date) ? 'ring-1 ring-yellow-500' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-ink3">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-elevated border border-line" />
          <span className="w-3 h-3 rounded-sm bg-orange-500/30" />
          <span className="w-3 h-3 rounded-sm bg-orange-500/60" />
          <span className="w-3 h-3 rounded-sm bg-orange-500" />
          <span>More</span>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between p-3 border-b border-line">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-elevated transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-ink">{format(month, 'MMMM yyyy')}</h2>
            <button onClick={() => setMonth(startOfMonth(new Date()))} className="text-[10px] text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5 transition-colors">
              Today
            </button>
          </div>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-elevated transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-ink3 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        {loading ? (
          <div className="p-8 text-center text-sm text-ink3">Loading…</div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map(date => {
              const inMonth = isSameMonth(date, month)
              const list = byDay.get(format(date, 'yyyy-MM-dd')) ?? []
              const pnl = dayPnl(date)
              const isSel = selectedDay && isSameDay(date, selectedDay)
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDay(list.length ? date : null)}
                  className={`min-h-[64px] sm:min-h-[84px] p-1.5 border-b border-r border-line text-left align-top transition-colors relative
                    ${inMonth ? '' : 'opacity-35'}
                    ${list.length ? 'hover:bg-elevated cursor-pointer' : 'cursor-default'}
                    ${isSel ? 'ring-1 ring-inset ring-yellow-500/50 bg-elevated' : ''}
                    ${pnl != null ? (pnl >= 0 ? 'bg-green-400/[0.06]' : 'bg-red-400/[0.06]') : ''}`}
                >
                  <span className={`text-xs font-semibold ${isToday(date) ? 'bg-yellow-500 text-black rounded-full w-5 h-5 inline-flex items-center justify-center' : 'text-ink2'}`}>
                    {format(date, 'd')}
                  </span>
                  {pnl != null && (
                    <p className={`mt-1 text-xs font-black leading-tight ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtMoney(pnl)}
                    </p>
                  )}
                  {list.length > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                      {pnl == null && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />}
                      <span className="text-[10px] text-ink3">{list.length} {list.length === 1 ? 'note' : 'notes'}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</h3>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-ink3 hover:text-ink">Close</button>
          </div>
          <div className="space-y-2">
            {selectedEntries.map(e => (
              <Link
                key={e.id}
                href="/journal"
                className="block rounded-lg border border-line bg-sunken p-3 hover:border-line2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {e.symbol && <span className="text-xs font-bold text-ink bg-surface border border-line rounded px-1.5 py-0.5 shrink-0">{e.symbol}</span>}
                    {e.direction && (
                      <span className={`text-xs font-bold shrink-0 ${e.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {e.direction === 'buy' ? '▲ BUY' : '▼ SELL'}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-ink truncate">{e.title || 'Untitled'}</span>
                  </div>
                  {e.pnl != null && (
                    <span className={`text-sm font-black shrink-0 ${e.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtMoney(e.pnl)}</span>
                  )}
                </div>
                <p className="text-xs text-ink3 mt-1 line-clamp-2">{e.content}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
