'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, NotebookPen, Flame, Trophy, ArrowRight, Check } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { journalingStreak, longestJournalingStreak, nextStreakMilestone, promptForDay } from '@/lib/journalTemplates'

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
  // Pinned once so streak/"today" maths stay pure across re-renders.
  const [today] = useState(() => new Date())
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

  // The streak, not a consistency grid, is what actually pulls people back: a
  // number you can lose tonight beats a chart of what you already did.
  const dayKeys = useMemo(() => new Set(entries.map(e => format(entryDate(e), 'yyyy-MM-dd'))), [entries])
  const journaledToday = dayKeys.has(format(today, 'yyyy-MM-dd'))
  const streak = useMemo(() => journalingStreak(entries.map(entryDate), today), [entries, today])
  const bestStreak = useMemo(() => longestJournalingStreak(entries.map(entryDate)), [entries])
  const journaledDays = dayKeys.size
  const milestone = nextStreakMilestone(streak)
  const todayPrompt = useMemo(() => promptForDay(today), [today])

  // The last 7 days as a dot trail — just enough context to see the streak,
  // and the gap at the end is the nag.
  const week = useMemo(
    () => eachDayOfInterval({ start: new Date(today.getTime() - 6 * 86400000), end: today })
      .map(date => ({ date, done: dayKeys.has(format(date, 'yyyy-MM-dd')) })),
    [dayKeys, today],
  )

  // What we push them to write, in order of what would help most right now.
  const recommendations = useMemo(() => {
    const recent = entries.filter(e => entryDate(e) >= new Date(today.getTime() - 7 * 86400000))
    const recs: { key: string; label: string; hint: string }[] = []
    if (!journaledToday) {
      recs.push({ key: 'prompt', label: todayPrompt.title, hint: "Today's prompt — 2 minutes" })
    }
    if (recent.some(e => e.result === 'loss')) {
      recs.push({ key: 'lesson', label: 'Turn this week’s loss into a rule', hint: 'The entry that pays for itself' })
    } else if (recent.some(e => e.result === 'win')) {
      recs.push({ key: 'win', label: 'Bank what worked', hint: 'Write down the setup while it is fresh' })
    }
    if (recs.length < 2) recs.push({ key: 'plan', label: 'Plan tomorrow’s session', hint: 'Decide before the candles move you' })
    return recs.slice(0, 2)
  }, [entries, journaledToday, todayPrompt, today])

  // One headline that changes with the state of the streak — praise when it is
  // safe, urgency when it is about to break, a fresh start when it already did.
  const streakCopy = journaledToday && streak > 0
    ? {
        tone: 'safe' as const,
        title: `${streak}-day streak, locked in for today`,
        body: milestone
          ? `${milestone - streak} more ${milestone - streak === 1 ? 'day' : 'days'} and you hit ${milestone}. Show up tomorrow and it becomes ${streak + 1}.`
          : `You are ${streak} days deep. Do not be the one who stops here.`,
      }
    : streak > 0
      ? {
          tone: 'risk' as const,
          title: `Your ${streak}-day streak ends at midnight`,
          body: `${streak} ${streak === 1 ? 'day' : 'days'} of work, gone unless you write one entry today. Three lines counts.`,
        }
      : journaledDays > 0
        ? {
            tone: 'reset' as const,
            title: 'Your streak is at zero',
            body: `Your best run was ${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}. Day 1 is the only hard one — start it now and beat it.`,
          }
        : {
            tone: 'reset' as const,
            title: 'Start your first streak today',
            body: 'Traders who write their trades down stop repeating them. One entry today is day 1.',
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

      {/* Streak */}
      <div className={`rounded-xl border p-4 ${
        streakCopy.tone === 'risk' ? 'bg-orange-500/[0.07] border-orange-500/30'
          : streakCopy.tone === 'safe' ? 'bg-surface border-orange-500/20'
            : 'bg-surface border-line'
      }`}>
        <div className="flex items-start gap-4">
          {/* The number itself */}
          <div className="shrink-0 text-center">
            <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${streak > 0 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-elevated border border-line'}`}>
              <Flame className={`absolute w-16 h-16 ${streak > 0 ? 'text-orange-500/10 fill-orange-500/10' : 'text-ink3/10'}`} />
              <span className={`relative text-2xl font-black leading-none ${streak > 0 ? 'text-orange-400' : 'text-ink3'}`}>{streak}</span>
            </div>
            <p className="text-[10px] text-ink3 uppercase tracking-wider mt-1">day{streak === 1 ? '' : 's'}</p>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className={`font-bold text-sm ${streakCopy.tone === 'risk' ? 'text-orange-400' : 'text-ink'}`}>{streakCopy.title}</h2>
            <p className="text-xs text-ink2 mt-1 leading-relaxed">{streakCopy.body}</p>

            {/* Progress to the next milestone */}
            {streak > 0 && milestone && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-ink3 mb-1">
                  <span>Next milestone</span>
                  <span className="font-bold text-orange-400">{streak}/{milestone} days</span>
                </div>
                <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.min(100, (streak / milestone) * 100)}%` }} />
                </div>
              </div>
            )}

            {/* Last 7 days — the empty dot on the right is the point */}
            <div className="flex items-center gap-1.5 mt-3">
              {week.map(({ date, done }) => (
                <div key={date.toISOString()} className="flex flex-col items-center gap-1">
                  <div
                    title={`${format(date, 'EEE, MMM d')} — ${done ? 'journaled' : 'nothing written'}`}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${done ? 'bg-orange-500/20 text-orange-400' : 'bg-elevated border border-line text-ink3'} ${isToday(date) ? 'ring-1 ring-yellow-500' : ''}`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : <span className="w-1 h-1 rounded-full bg-current opacity-40" />}
                  </div>
                  <span className="text-[9px] text-ink3">{format(date, 'EEEEE')}</span>
                </div>
              ))}
            </div>

            {/* Where to go write it */}
            <div className="mt-3 flex flex-col gap-1.5">
              {recommendations.map(r => (
                <Link
                  key={r.key}
                  href={`/journal?compose=${r.key}`}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-3 py-2 hover:border-yellow-500/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{r.label}</p>
                    <p className="text-[10px] text-ink3 truncate">{r.hint}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink3 group-hover:text-yellow-500 shrink-0 transition-colors" />
                </Link>
              ))}
            </div>

            {journaledDays > 0 && (
              <div className="flex items-center gap-3 mt-3 text-[10px] text-ink3">
                <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Best: {bestStreak} day{bestStreak === 1 ? '' : 's'}</span>
                <span>{journaledDays} day{journaledDays === 1 ? '' : 's'} journaled all-time</span>
              </div>
            )}
          </div>
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
