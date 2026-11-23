'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Plus, Trash2, Edit3, X, Check, ChevronLeft, CalendarDays, BarChart3, Pin, PinOff, Flame, Sparkles, TrendingUp, TrendingDown, ClipboardList, Lightbulb, Share2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'
import { JournalAnalytics } from './JournalAnalytics'
import { ChartUpload } from '@/components/trading/ChartUpload'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { SETUPS_AZ, setupLabel, setupLabels, setupMatches, parseSetups } from '@/lib/setups'
import { deriveTrade } from '@/lib/journal'
import { pipConfig, pipUnit } from '@/lib/trading'

/**
 * Signed pips from entry to exit (1 gold point = 10 pips); points on crypto
 * and indices. Null until symbol, direction, entry and exit are all set.
 */
function tradeMove(t: { symbol?: string | null; direction?: string | null; entryPrice?: number | string | null; exitPrice?: number | string | null }) {
  const entry = Number(t.entryPrice), exit = Number(t.exitPrice)
  if (!t.symbol || !t.direction || t.entryPrice == null || t.exitPrice == null || t.entryPrice === '' || t.exitPrice === '') return null
  if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null
  const move = t.direction === 'sell' ? entry - exit : exit - entry
  const value = Math.round((move / pipConfig(t.symbol).pipSize) * 10) / 10
  return { value, unit: pipUnit(t.symbol) }
}

function PipsBadge({ move }: { move: { value: number; unit: string } | null }) {
  if (!move) return null
  return (
    <span className={`text-xs font-bold tabular-nums rounded px-1.5 py-0.5 ${move.value >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
      {move.value > 0 ? '+' : ''}{move.value} {move.unit}
    </span>
  )
}
import { JOURNAL_TEMPLATES, getTemplate, promptForDay, journalingStreak, type JournalTemplate } from '@/lib/journalTemplates'

const DRAFT_KEY = 'ght:journalDraft'
// Analytics unlocks once there's enough logged to be meaningful — the locked
// teaser is itself the pull to journal more (#5).
const ANALYTICS_MIN = 3

interface JournalEntry {
  id: string
  title: string | null
  content: string
  mood: string | null
  pinned: boolean
  symbol: string | null
  direction: string | null
  result: string | null
  pnl: number | null
  tradedAt: string | null
  entryPrice: number | null
  exitPrice: number | null
  stopPrice: number | null
  targetPrice: number | null
  lots: number | null
  rMultiple: number | null
  setup: string | null
  chartUrl: string | null
  createdAt: string
  updatedAt: string
}

/** Same order the API returns: pinned entries first, then newest-first. Applied
 *  locally after a pin toggle so a re-pinned entry jumps without a refetch. */
function sortEntries(list: JournalEntry[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** How an R-multiple reads at a glance: green above breakeven, red below. */
function fmtR(r: number) {
  return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`
}

const results = [
  { value: 'win',        label: '✅ Win',        cls: 'text-green-400' },
  { value: 'loss',       label: '❌ Loss',       cls: 'text-red-400'   },
  { value: 'breakeven',  label: '➖ Break-even', cls: 'text-ink2' },
]

function fmtMoney(n: number) {
  const s = n >= 0 ? '+' : '-'
  return `${s}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const moods = [
  { value: 'bullish',   label: '📈 Bullish'   },
  { value: 'bearish',   label: '📉 Bearish'   },
  { value: 'neutral',   label: '😐 Neutral'   },
  { value: 'satisfied', label: '😊 Satisfied' },
  { value: 'frustrated',label: '😤 Frustrated'},
  { value: 'analyzing', label: '🤔 Analyzing' },
]

function moodLabel(value: string | null) {
  return moods.find(m => m.value === value)?.label ?? null
}

const templateIcons: Record<string, typeof BookOpen> = {
  win: TrendingUp, loss: TrendingDown, plan: ClipboardList, lesson: Lightbulb,
}

/**
 * Build the public feed post for a journal entry (#3). Deliberately shares only
 * the structured trade summary — never the private free-text notes, and never
 * the dollar P&L amount (same discretion as the leaderboard). Win/loss, R and
 * setups are the parts worth showing the community.
 */
function buildShareContent(entry: JournalEntry): string {
  const dir = entry.direction === 'buy' ? '▲ BUY' : entry.direction === 'sell' ? '▼ SELL' : ''
  const res = entry.result === 'win' ? '✅ Win' : entry.result === 'loss' ? '❌ Loss' : entry.result === 'breakeven' ? '➖ Breakeven' : ''
  const r = entry.rMultiple != null ? `${entry.rMultiple >= 0 ? '+' : ''}${entry.rMultiple.toFixed(2)}R` : ''
  const setups = setupLabels(entry.setup).join(' · ')
  const headline = [entry.symbol, dir, res, r].filter(Boolean).join('  ·  ')
  return [
    '📓 From my trading journal',
    headline || null,
    setups ? `Setup: ${setups}` : null,
  ].filter(Boolean).join('\n')
}

const fieldCls = 'h-[38px] bg-sunken border border-line rounded-lg px-3 text-sm text-ink outline-none focus:border-yellow-500/50 placeholder-ink3/60'

function PriceStat({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <div>
      <p className="text-[10px] text-ink3 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-ink tabular-nums">{value}</p>
    </div>
  )
}

function PriceField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs text-ink3 mb-1">{label}</span>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className={`${fieldCls} w-full tabular-nums`}
      />
    </label>
  )
}

function FormSection({ title, hint, required, action, children }: {
  title: string; hint?: string; required?: boolean; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-sm font-semibold text-ink">
          {title}{required && <span className="text-red-400 ml-0.5" aria-label="required">*</span>}
        </h3>
        {hint && <span className="text-xs text-ink3 truncate">{hint}</span>}
        {action && <span className="ml-auto shrink-0">{action}</span>}
      </div>
      {children}
    </section>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs text-ink3 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`text-xs px-3 py-1.5 min-h-8 rounded-full border transition-colors ${active ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-400' : 'border-line text-ink2 hover:border-line2 hover:text-ink'}`}>
      {children}
    </button>
  )
}

/** One-of choice (tap again to clear), sized like the inputs beside it. */
function Segmented({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string; activeCls: string }[]
}) {
  return (
    <div role="radiogroup" className="flex h-[38px] rounded-lg border border-line bg-sunken p-0.5">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(value === o.value ? '' : o.value)}
          className={`flex-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${value === o.value ? o.activeCls : 'text-ink3 hover:text-ink2'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JournalEntry | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('')
  const [result, setResult] = useState('')
  const [pnl, setPnl] = useState('')
  const [tradedAt, setTradedAt] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [lots, setLots] = useState('')
  const [setups, setSetups] = useState<string[]>([])
  const [setupQuery, setSetupQuery] = useState('')
  const [chartUrl, setChartUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const [view, setView] = useState<'entries' | 'analytics'>('entries')
  const [chartOpen, setChartOpen] = useState(false)
  const [shareEntry, setShareEntry] = useState<JournalEntry | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareDone, setShareDone] = useState(false)

  // Live preview of what the server will store. Same function the API uses, so
  // the number in the form is the number that gets saved.
  const trade = useMemo(
    () => deriveTrade({ symbol, direction, entryPrice, exitPrice, stopPrice, targetPrice, lots, pnl, result }),
    [symbol, direction, entryPrice, exitPrice, stopPrice, targetPrice, lots, pnl, result],
  )

  // Consecutive days journaled, ending today/yesterday. A visible streak is a
  // strong habit cue, so it lives in the header.
  const streak = useMemo(() => journalingStreak(entries.map(e => e.createdAt)), [entries])
  const todayPrompt = useMemo(() => promptForDay(), [])

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

  // Autosave the in-progress new entry so nothing is lost on an accidental close.
  useEffect(() => {
    if (mode !== 'new' || typeof window === 'undefined') return
    if (!title && !content && !mood) { localStorage.removeItem(DRAFT_KEY); return }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, mood }))
  }, [mode, title, content, mood])

  function resetTradeFields() {
    setSymbol('')
    setDirection('')
    setResult('')
    setPnl('')
    setTradedAt('')
    setEntryPrice('')
    setExitPrice('')
    setStopPrice('')
    setTargetPrice('')
    setLots('')
    setSetups([])
    setSetupQuery('')
    setChartUrl(null)
  }

  function toggleSetup(value: string) {
    setSetups(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  // The A–Z list narrowed by the search box. Anything already tagged stays in
  // the list even when it doesn't match, so a filter can never hide — or make
  // you lose track of — a selection you've made.
  const visibleSetups = useMemo(
    () => SETUPS_AZ.filter(s => setups.includes(s.value) || setupMatches(s, setupQuery)),
    [setupQuery, setups],
  )

  function openNew(prefill?: { title?: string; content?: string; mood?: string; result?: string; direction?: string; symbol?: string }) {
    // No prefill = the plain "New Entry" button: restore an unsaved draft so a
    // half-written entry is never lost (#10).
    if (!prefill && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) prefill = JSON.parse(raw)
      } catch {}
    }
    setSelected(null)
    setError(null)
    setTitle(prefill?.title ?? '')
    setContent(prefill?.content ?? '')
    setMood(prefill?.mood ?? '')
    resetTradeFields()
    if (prefill?.result) setResult(prefill.result)
    if (prefill?.direction) setDirection(prefill.direction)
    if (prefill?.symbol) setSymbol(prefill.symbol)
    setMode('new')
    setMobileShowEditor(true)
    setView('entries')
  }

  /** Open the composer pre-filled from a starter template (#6 / quick-add). */
  const openTemplate = useCallback((t: JournalTemplate) => {
    openNew({ title: t.title, content: t.content, mood: t.mood, result: t.result, direction: t.direction })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Open the composer scaffolded with today's reflection prompt (#7). */
  function openPrompt() {
    openNew({ title: todayPrompt.title, content: `${todayPrompt.content}\n\n` })
  }

  /** One-tap mood log: create a minimal entry immediately (#10). */
  async function quickLogMood(m: { value: string; label: string }) {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: null, content: `Feeling ${m.label}`, mood: m.value }),
      })
      if (res.ok) {
        const created = await res.json()
        setEntries(e => [created, ...e])
        setSelected(created)
        setMode('view')
        setMobileShowEditor(true)
      }
    } finally {
      setSaving(false)
    }
  }

  // Deep-link into the composer from anywhere in the app: /journal?compose=<key>
  // powers the empty-state templates, mobile quick-add, the welcome tour and the
  // "log this trade" prompt after a signal closes. Read once on mount; the param
  // is then stripped so a refresh doesn't reopen it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'analytics') { setView('analytics'); window.history.replaceState(null, '', '/journal') }
    const key = params.get('compose')
    if (!key) return
    // Optional trade context carried in from a signal card (#1).
    const symbolP = params.get('symbol')?.toUpperCase() || undefined
    const directionP = params.get('direction') || undefined
    if (key === 'prompt') openPrompt()
    else {
      const t = getTemplate(key)
      openNew(t
        ? { title: t.title, content: t.content, mood: t.mood, result: t.result, direction: directionP ?? t.direction, symbol: symbolP }
        : { symbol: symbolP, direction: directionP })
    }
    window.history.replaceState(null, '', '/journal')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTemplate])

  function openEntry(entry: JournalEntry) {
    setSelected(entry)
    setMode('view')
    setMobileShowEditor(true)
  }

  function startEdit(entry: JournalEntry) {
    setError(null)
    setTitle(entry.title ?? '')
    setContent(entry.content)
    setMood(entry.mood ?? '')
    setSymbol(entry.symbol ?? '')
    setDirection(entry.direction ?? '')
    setResult(entry.result ?? '')
    setPnl(entry.pnl == null ? '' : String(entry.pnl))
    setTradedAt(entry.tradedAt ? entry.tradedAt.slice(0, 10) : '')
    setEntryPrice(entry.entryPrice == null ? '' : String(entry.entryPrice))
    setExitPrice(entry.exitPrice == null ? '' : String(entry.exitPrice))
    setStopPrice(entry.stopPrice == null ? '' : String(entry.stopPrice))
    setTargetPrice(entry.targetPrice == null ? '' : String(entry.targetPrice))
    setLots(entry.lots == null ? '' : String(entry.lots))
    setSetups(parseSetups(entry.setup))
    setSetupQuery('')
    setChartUrl(entry.chartUrl)
    setMode('edit')
  }

  /** Validate the form before saving. Returns a friendly message, or null if OK. */
  function validate(): string | null {
    if (!content.trim()) return 'Add a note before saving — even a line about how the trade felt.'
    // A P&L with a result but no prices is fine (hand-typed). But a stray,
    // non-numeric P&L should be caught before it silently becomes null.
    if (pnl.trim() !== '' && Number.isNaN(Number(pnl))) return 'P&L must be a number, e.g. 250 or -80.'
    const priceFields: [string, string][] = [
      ['Entry', entryPrice], ['Exit', exitPrice], ['Stop', stopPrice], ['Target', targetPrice], ['Lots', lots],
    ]
    for (const [label, v] of priceFields) {
      if (v.trim() !== '' && Number.isNaN(Number(v))) return `${label} price must be a number.`
    }
    return null
  }

  async function handleSave() {
    const problem = validate()
    if (problem) {
      setError(problem)
      // Take them to the field that needs fixing.
      if (!content.trim()) { notesRef.current?.focus(); notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      return
    }
    setError(null)

    const tradePayload = {
      symbol: symbol.trim().toUpperCase() || null,
      direction: direction || null,
      result: result || null,
      pnl: pnl.trim() === '' ? null : pnl,
      tradedAt: tradedAt || null,
      entryPrice: entryPrice.trim() || null,
      exitPrice: exitPrice.trim() || null,
      stopPrice: stopPrice.trim() || null,
      targetPrice: targetPrice.trim() || null,
      lots: lots.trim() || null,
      setup: setups,
      chartUrl,
    }
    setSaving(true)
    try {
      if (mode === 'new') {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || null, content, mood: mood || null, ...tradePayload }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error || "Couldn't save your entry. Please try again.")
          return
        }
        const created = await res.json()
        setEntries(e => [created, ...e])
        setSelected(created)
        setMode('view')
        if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY)
      } else if (mode === 'edit' && selected) {
        const res = await fetch(`/api/journal/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || null, content, mood: mood || null, ...tradePayload }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error || "Couldn't save your changes. Please try again.")
          return
        }
        const updated = await res.json()
        setEntries(e => e.map(x => x.id === updated.id ? updated : x))
        setSelected(updated)
        setMode('view')
      }
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function shareToFeed(entry: JournalEntry) {
    setSharing(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: buildShareContent(entry),
          images: entry.chartUrl ? [entry.chartUrl] : [],
          feeling: 'journal',
          privacy: 'public',
        }),
      })
      if (res.ok) {
        setShareDone(true)
        setTimeout(() => { setShareEntry(null); setShareDone(false) }, 1400)
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleDelete(entry: JournalEntry) {
    setDeleting(true)
    try {
      await fetch(`/api/journal/${entry.id}`, { method: 'DELETE' })
      setEntries(e => e.filter(x => x.id !== entry.id))
      setSelected(null)
      setMode('view')
      setMobileShowEditor(false)
    } finally {
      setDeleting(false)
    }
  }

  async function togglePin(entry: JournalEntry) {
    const pinned = !entry.pinned
    // Optimistic: flip and re-sort now, reconcile with the server's row after.
    setEntries(e => sortEntries(e.map(x => x.id === entry.id ? { ...x, pinned } : x)))
    if (selected?.id === entry.id) setSelected(s => s && { ...s, pinned })
    try {
      const res = await fetch(`/api/journal/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      })
      if (!res.ok) throw new Error('pin failed')
      const updated = await res.json()
      setEntries(e => sortEntries(e.map(x => x.id === updated.id ? updated : x)))
      setSelected(s => s?.id === updated.id ? updated : s)
    } catch {
      // Roll back on failure.
      setEntries(e => sortEntries(e.map(x => x.id === entry.id ? { ...x, pinned: entry.pinned } : x)))
      if (selected?.id === entry.id) setSelected(s => s && { ...s, pinned: entry.pinned })
    }
  }

  function cancelEdit() {
    setError(null)
    if (mode === 'new') {
      setMode('view')
      setMobileShowEditor(false)
    } else {
      setMode('view')
    }
  }

  // Activation block: a daily prompt, one-tap starter templates and a mood
  // quick-log. Turns the blank page into a menu of half-written entries — the
  // single biggest lever on getting a first entry written. Reused in the empty
  // list and the "nothing selected" pane.
  const quickStart = (
    <div className="p-4 space-y-4 text-left">
      <div>
        <p className="text-sm font-bold text-ink">Start your journal</p>
        <p className="text-xs text-ink3 mt-0.5">Pick a template — it opens half-written so you just fill the blanks.</p>
      </div>

      {/* Today's reflection prompt (#7) */}
      <button
        onClick={openPrompt}
        className="w-full flex items-start gap-2.5 rounded-lg border border-yellow-500/25 bg-yellow-500/5 hover:bg-yellow-500/10 px-3 py-2.5 text-left transition-colors"
      >
        <Sparkles className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-yellow-500/80">Today&apos;s prompt</span>
          <span className="block text-sm font-semibold text-ink leading-snug">{todayPrompt.title}</span>
        </span>
      </button>

      {/* Starter templates (#6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {JOURNAL_TEMPLATES.map(t => {
          const Icon = templateIcons[t.key] ?? BookOpen
          return (
            <button
              key={t.key}
              onClick={() => openTemplate(t)}
              className="flex items-start gap-2.5 rounded-lg border border-line bg-sunken hover:border-yellow-500/40 hover:bg-elevated px-3 py-2.5 text-left transition-colors"
            >
              <Icon className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-ink leading-tight">{t.label}</span>
                <span className="block text-[11px] text-ink3 mt-0.5 leading-snug">{t.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Mood-only quick log (#10) */}
      <div>
        <p className="text-[11px] text-ink3 mb-1.5">Just checking in? Log how you&apos;re feeling in one tap:</p>
        <div className="flex flex-wrap gap-1.5">
          {moods.map(m => (
            <button
              key={m.value}
              onClick={() => quickLogMood(m)}
              disabled={saving}
              className="text-xs px-2.5 py-1 rounded-full border border-line text-ink2 hover:border-yellow-500/40 hover:text-ink disabled:opacity-50 transition-colors"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => openNew()} className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
        …or start from a blank page →
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">My Journal</h1>
          {streak > 0 && (
            <span
              title={`You've journaled ${streak} day${streak === 1 ? '' : 's'} in a row — keep it going!`}
              className="flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-bold px-2 py-0.5"
            >
              <Flame className="w-3.5 h-3.5 fill-orange-400" /> {streak}-day streak
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calendar" className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </Link>
          <Button variant="gold" size="sm" onClick={() => openNew()} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Entry
          </Button>
        </div>
      </div>

      {/* view tabs */}
      <div className="flex gap-2">
        {(['entries', 'analytics'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === v ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
            {v === 'analytics' && <BarChart3 className="w-4 h-4" />}
            {v === 'entries' ? 'Entries' : 'Analytics'}
          </button>
        ))}
      </div>

      {view === 'analytics' ? (
        entries.length < ANALYTICS_MIN ? (
          <div className="bg-surface rounded-xl border border-line p-8 text-center max-w-md mx-auto">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 grid place-items-center mb-3">
              <BarChart3 className="w-6 h-6 text-yellow-500" />
            </div>
            <h2 className="font-bold text-ink">Your edge report is almost ready</h2>
            <p className="text-sm text-ink3 mt-1.5">
              Log {ANALYTICS_MIN - entries.length} more {ANALYTICS_MIN - entries.length === 1 ? 'trade' : 'trades'} to unlock your win rate, profit
              factor, equity curve and best-performing setups.
            </p>
            <div className="mt-3 h-2 rounded-full bg-elevated overflow-hidden">
              <div className="h-full bg-yellow-500 transition-all" style={{ width: `${Math.round((entries.length / ANALYTICS_MIN) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-ink3 mt-1.5">{entries.length} of {ANALYTICS_MIN} entries</p>
            <Button variant="gold" size="sm" onClick={() => openNew()} className="mt-4 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Log a trade
            </Button>
          </div>
        ) : (
          <JournalAnalytics entries={entries} />
        )
      ) : (
      <div
        /* dvh, not vh: mobile browser chrome makes 100vh taller than what you can
           see, which pushed the composer's Save row under the bottom nav. The
           bigger mobile subtraction also reserves room for the fixed bottom nav. */
        className="flex gap-4 h-[calc(100dvh-20rem)] min-h-104 lg:h-[calc(100vh-13rem)] lg:min-h-0"
      >
        {/* Entry list. With no entries yet, desktop hides it — the main pane
            already shows the "Start your journal" templates, so showing them in
            both columns doubled up. Phones keep it (it's their only view). */}
        <div className={`flex flex-col w-full lg:w-72 shrink-0 bg-surface rounded-xl border border-line overflow-hidden ${mobileShowEditor ? 'hidden' : 'flex'} ${!loading && entries.length === 0 ? 'lg:hidden' : 'lg:flex'}`}>
          <div className="p-3 border-b border-line">
            <p className="text-xs text-ink3">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} · visible only to you</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1,2,3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-3/4 bg-line rounded" />
                    <div className="h-2 w-1/2 bg-line rounded" />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              quickStart
            ) : (
              entries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                  className={`w-full text-left p-3 border-b border-line hover:bg-elevated transition-colors ${selected?.id === entry.id ? 'bg-elevated border-l-2 border-l-yellow-500' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-sm font-semibold text-ink truncate">
                      {entry.pinned && <Pin className="w-3 h-3 text-yellow-500 shrink-0 fill-yellow-500" />}
                      <span className="truncate">{entry.title || 'Untitled'}</span>
                    </p>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <PipsBadge move={tradeMove(entry)} />
                      {entry.pnl != null && (
                        <span className={`text-xs font-bold ${entry.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtMoney(entry.pnl)}</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-ink3 truncate mt-0.5">
                    {entry.symbol ? <span className="text-ink2 font-medium">{entry.symbol} · </span> : null}{entry.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-line2">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                    {entry.rMultiple != null && (
                      <span className={`text-[10px] font-bold tabular-nums ${entry.rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fmtR(entry.rMultiple)}
                      </span>
                    )}
                    {entry.setup && (
                      <span className="text-[10px] text-ink3 truncate">{setupLabels(entry.setup).join(' · ')}</span>
                    )}
                    {entry.mood && (
                      <span className="text-[10px] text-ink3 shrink-0">{moodLabel(entry.mood)}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor / Viewer */}
        <div className={`flex-1 bg-surface rounded-xl border border-line overflow-hidden flex flex-col ${mobileShowEditor ? 'flex' : 'hidden lg:flex'}`}>
          {/* Mobile back button */}
          <div className="lg:hidden flex items-center gap-2 p-3 border-b border-line">
            <button onClick={() => setMobileShowEditor(false)} className="flex items-center gap-1.5 text-xs text-ink2 hover:text-ink transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> All entries
            </button>
          </div>

          {(mode === 'new' || mode === 'edit') ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Title */}
              <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-500">{mode === 'new' ? 'New entry' : 'Edit entry'}</p>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Give it a title (optional)"
                  className="mt-1 w-full min-w-0 bg-transparent text-ink font-bold text-xl outline-none placeholder-ink3/60"
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 sm:px-5 py-4 space-y-5">
                  {/* Notes — the one required field */}
                  <FormSection title="Notes" required hint="What happened, why you took it, how it felt">
                    <textarea
                      ref={notesRef}
                      value={content}
                      onChange={e => { setContent(e.target.value); if (error) setError(null) }}
                      placeholder="e.g. Waited for the London sweep of the Asia low, entered on the break of structure…"
                      className={`w-full min-h-36 sm:min-h-44 bg-sunken text-ink text-sm outline-none resize-y rounded-xl p-3 placeholder-ink3/70 leading-relaxed border transition-colors ${error && !content.trim() ? 'border-red-500/60' : 'border-line focus:border-yellow-500/50'}`}
                    />
                    <div className="mt-2.5">
                      <p className="text-xs text-ink3 mb-1.5">How did you feel?</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {moods.map(m => (
                          <Chip key={m.value} active={mood === m.value} onClick={() => setMood(mood === m.value ? '' : m.value)}>{m.label}</Chip>
                        ))}
                      </div>
                    </div>
                  </FormSection>

                  {/* The trade */}
                  <FormSection title="Trade" hint="Optional · fills your calendar and analytics">
                    <div className="grid grid-cols-2 gap-2.5">
                      <FieldLabel label="Symbol">
                        <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="XAUUSD"
                          className={`${fieldCls} w-full uppercase`} />
                      </FieldLabel>
                      <FieldLabel label="Trade date">
                        <input type="date" value={tradedAt} onChange={e => setTradedAt(e.target.value)}
                          className={`${fieldCls} w-full scheme-dark`} />
                      </FieldLabel>
                      <FieldLabel label="Direction">
                        <Segmented
                          value={direction}
                          onChange={setDirection}
                          options={[
                            { value: 'buy', label: '▲ Buy', activeCls: 'bg-green-400/15 text-green-400' },
                            { value: 'sell', label: '▼ Sell', activeCls: 'bg-red-400/15 text-red-400' },
                          ]}
                        />
                      </FieldLabel>
                      <FieldLabel label="Result">
                        <Segmented
                          value={result}
                          onChange={setResult}
                          options={[
                            { value: 'win', label: 'Win', activeCls: 'bg-green-400/15 text-green-400' },
                            { value: 'loss', label: 'Loss', activeCls: 'bg-red-400/15 text-red-400' },
                            { value: 'breakeven', label: 'B/E', activeCls: 'bg-elevated text-ink' },
                          ]}
                        />
                      </FieldLabel>
                    </div>
                  </FormSection>

                  {/* Prices and P&L */}
                  <FormSection title="Prices & P&L" hint="Entry + exit + lots work out the P&L; add a stop to see R">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <PriceField label="Entry"  value={entryPrice}  onChange={setEntryPrice} />
                      <PriceField label="Exit"   value={exitPrice}   onChange={setExitPrice} />
                      <PriceField label="Lots"   value={lots}        onChange={setLots} placeholder="0.10" />
                      <PriceField label="Stop"   value={stopPrice}   onChange={setStopPrice} />
                      <PriceField label="Target" value={targetPrice} onChange={setTargetPrice} />
                      {!trade.derived && (
                        <FieldLabel label="P&L ($)">
                          <input type="number" step="any" inputMode="decimal" value={pnl} onChange={e => setPnl(e.target.value)}
                            placeholder="250 or -80" className={`${fieldCls} w-full tabular-nums`} />
                        </FieldLabel>
                      )}
                    </div>

                    {(trade.derived || tradeMove({ symbol, direction, entryPrice, exitPrice }) || pnl.trim()) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
                        {trade.derived ? (
                          <span className={`text-lg font-black tabular-nums ${(trade.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtMoney(trade.pnl ?? 0)}</span>
                        ) : pnl.trim() && !Number.isNaN(Number(pnl)) ? (
                          <span className={`text-lg font-black tabular-nums ${result === 'loss' || (result !== 'win' && Number(pnl) < 0) ? 'text-red-400' : 'text-green-400'}`}>
                            {fmtMoney(result === 'loss' ? -Math.abs(Number(pnl)) : result === 'win' ? Math.abs(Number(pnl)) : Number(pnl))}
                          </span>
                        ) : null}
                        {trade.rMultiple != null && (
                          <span className={`text-xs font-bold tabular-nums rounded px-1.5 py-0.5 ${trade.rMultiple >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{fmtR(trade.rMultiple)}</span>
                        )}
                        <PipsBadge move={tradeMove({ symbol, direction, entryPrice, exitPrice })} />
                        <span className="text-[11px] text-ink3 basis-full">
                          {trade.derived
                            ? (trade.rMultiple == null ? 'Worked out from your prices. Add a stop to see it in R.' : 'Worked out from your prices.')
                            : result === 'loss' || result === 'win' ? `Saved as a ${result}.` : 'Use a minus sign for a loss.'}
                        </span>
                      </div>
                    )}
                  </FormSection>

                  {/* Setups */}
                  <FormSection
                    title="Setups"
                    hint={setups.length ? `${setups.length} tagged` : 'Tap all that apply'}
                    action={setups.length > 0 ? <button type="button" onClick={() => setSetups([])} className="text-xs text-ink3 hover:text-ink2 underline">Clear</button> : null}
                  >
                    {setups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {setups.map(v => (
                          <button key={v} type="button" onClick={() => toggleSetup(v)} aria-label={`Remove ${setupLabel(v)}`}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/50 text-yellow-400">
                            {setupLabel(v)} <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        value={setupQuery}
                        onChange={e => setSetupQuery(e.target.value)}
                        placeholder="Search setups (fvg, ob, ote…)"
                        className={`${fieldCls} w-full ${setupQuery ? 'pr-8' : ''}`}
                      />
                      {setupQuery && (
                        <button type="button" onClick={() => setSetupQuery('')} aria-label="Clear setup search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2 text-sm leading-none">×</button>
                      )}
                    </div>
                    <ScrollArea className="max-h-40 sm:max-h-44 mt-2" contentClassName="flex flex-wrap gap-1.5">
                      {visibleSetups.filter(s => !setups.includes(s.value)).map(s => (
                        <Chip key={s.value} active={false} onClick={() => toggleSetup(s.value)}>{s.label}</Chip>
                      ))}
                      {visibleSetups.length === 0 && (
                        <p className="text-xs text-ink3 py-1">
                          No setup matches “{setupQuery.trim()}”. Pick{' '}
                          <button type="button" onClick={() => { setSetupQuery(''); toggleSetup('other') }} className="text-yellow-400 hover:underline">{setupLabel('other')}</button>{' '}
                          if none fit.
                        </p>
                      )}
                    </ScrollArea>
                  </FormSection>

                  {/* Chart */}
                  <FormSection title="Chart" hint="Optional screenshot of the setup">
                    <ChartUpload value={chartUrl} onChange={setChartUrl} label="Add chart screenshot" />
                  </FormSection>
                </div>
              </div>

              {/* Actions stay at the bottom, where you finish the form */}
              {error && (
                <div className="px-4 sm:px-5 py-2 bg-red-500/10 border-t border-red-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-px" />
                  <span className="text-xs text-red-400 leading-snug">{error}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-line bg-surface">
                <span className="hidden sm:block text-[11px] text-ink3 mr-auto">
                  {mode === 'new' ? 'Your draft is kept if you leave' : 'Editing'}
                </span>
                <Button variant="secondary" size="sm" onClick={cancelEdit} className="flex-1 sm:flex-none min-h-10 gap-1">
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button variant="gold" size="sm" onClick={handleSave} loading={saving} className="flex-1 sm:flex-none sm:min-w-32 min-h-10 gap-1">
                  <Check className="w-3.5 h-3.5" /> {mode === 'new' ? 'Save entry' : 'Save changes'}
                </Button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-line flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink text-lg">{selected.title || 'Untitled'}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-ink3">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {selected.mood && <span className="text-xs text-ink2">· {moodLabel(selected.mood)}</span>}
                  </div>
                  {(selected.symbol || selected.direction || selected.result || selected.pnl != null || selected.setup) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {selected.symbol && <span className="text-xs font-bold text-ink bg-sunken border border-line rounded px-1.5 py-0.5">{selected.symbol}</span>}
                      {selected.direction && (
                        <span className={`text-xs font-bold rounded px-1.5 py-0.5 ${selected.direction === 'buy' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {selected.direction === 'buy' ? '▲ BUY' : '▼ SELL'}
                        </span>
                      )}
                      {setupLabels(selected.setup).map(label => (
                        <span key={label} className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                          {label}
                        </span>
                      ))}
                      {selected.result && <span className="text-xs text-ink2">{results.find(r => r.value === selected.result)?.label}</span>}
                      <PipsBadge move={tradeMove(selected)} />
                      {selected.pnl != null && (
                        <span className={`text-xs font-bold ${selected.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtMoney(selected.pnl)}</span>
                      )}
                      {selected.rMultiple != null && (
                        <span className={`text-xs font-bold tabular-nums rounded px-1.5 py-0.5 ${selected.rMultiple >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {fmtR(selected.rMultiple)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => { setShareDone(false); setShareEntry(selected) }}
                    title="Share to community feed"
                    className="p-1.5 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-line transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePin(selected)}
                    title={selected.pinned ? 'Unpin entry' : 'Pin to top'}
                    className={`p-1.5 rounded-lg transition-colors hover:bg-line ${selected.pinned ? 'text-yellow-500' : 'text-ink3 hover:text-yellow-500'}`}
                  >
                    {selected.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => startEdit(selected)} className="p-1.5 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-line transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(selected)} disabled={deleting} className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-line transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* The trade as executed — planned target next to the actual exit,
                    which is where cutting winners early shows up. */}
                {(selected.entryPrice != null || selected.exitPrice != null) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-line bg-sunken px-3 py-2.5">
                    <PriceStat label="Entry" value={selected.entryPrice} />
                    <PriceStat label="Exit" value={selected.exitPrice} />
                    <PriceStat label="Stop" value={selected.stopPrice} />
                    <PriceStat label="Target" value={selected.targetPrice} />
                    <PriceStat label="Lots" value={selected.lots} />
                  </div>
                )}

                {selected.chartUrl && (
                  <>
                    <button
                      onClick={() => setChartOpen(true)}
                      className="block w-full rounded-lg overflow-hidden border border-line bg-sunken cursor-zoom-in"
                    >
                      <Image
                        src={selected.chartUrl}
                        alt="Trade chart"
                        width={1200}
                        height={675}
                        className="w-full max-h-80 object-contain"
                        unoptimized
                      />
                    </button>
                    {chartOpen && (
                      <ImageLightbox images={[selected.chartUrl]} startIndex={0} onClose={() => setChartOpen(false)} />
                    )}
                  </>
                )}

                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{selected.content}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-lg mx-auto">
                {quickStart}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Share-to-feed preview (#3). Confirms an outward-facing post and shows
          exactly what the community will see — summary only, no private notes,
          no dollar amount. */}
      {shareEntry && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => !sharing && setShareEntry(null)}>
          <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-line flex items-center justify-between">
              <h3 className="font-bold text-ink flex items-center gap-2"><Share2 className="w-4 h-4 text-yellow-500" /> Share to feed</h3>
              <button onClick={() => !sharing && setShareEntry(null)} className="p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-elevated"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-ink3">Only the trade summary is shared — your notes and P&amp;L amount stay private.</p>
              <div className="rounded-lg border border-line bg-sunken p-3">
                <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{buildShareContent(shareEntry)}</p>
                {shareEntry.chartUrl && (
                  <div className="mt-2 rounded-md overflow-hidden border border-line">
                    <Image src={shareEntry.chartUrl} alt="chart" width={800} height={450} className="w-full max-h-40 object-contain" unoptimized />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-line">
              <Button variant="secondary" size="sm" onClick={() => setShareEntry(null)} disabled={sharing}>Cancel</Button>
              <Button variant="gold" size="sm" onClick={() => shareToFeed(shareEntry)} loading={sharing} disabled={shareDone} className="gap-1.5">
                {shareDone ? <><Check className="w-3.5 h-3.5" /> Shared!</> : <><Share2 className="w-3.5 h-3.5" /> Share to feed</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
