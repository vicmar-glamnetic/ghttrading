'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Plus, Trash2, Edit3, X, Check, ChevronLeft, CalendarDays, BarChart3, Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'
import { JournalAnalytics } from './JournalAnalytics'
import { ChartUpload } from '@/components/trading/ChartUpload'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { SETUPS, setupLabel } from '@/lib/setups'
import { deriveTrade } from '@/lib/journal'

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

const fieldCls = 'bg-sunken border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-line2'

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
    <label className="block">
      <span className="text-[10px] text-ink3">{label}</span>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className={`${fieldCls} mt-0.5 w-full tabular-nums`}
      />
    </label>
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
  const [setup, setSetup] = useState('')
  const [chartUrl, setChartUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)
  const [view, setView] = useState<'entries' | 'analytics'>('entries')
  const [chartOpen, setChartOpen] = useState(false)

  // Live preview of what the server will store. Same function the API uses, so
  // the number in the form is the number that gets saved.
  const trade = useMemo(
    () => deriveTrade({ symbol, direction, entryPrice, exitPrice, stopPrice, targetPrice, lots, pnl, result }),
    [symbol, direction, entryPrice, exitPrice, stopPrice, targetPrice, lots, pnl, result],
  )

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
    setSetup('')
    setChartUrl(null)
  }

  function openNew() {
    setSelected(null)
    setTitle('')
    setContent('')
    setMood('')
    resetTradeFields()
    setMode('new')
    setMobileShowEditor(true)
  }

  function openEntry(entry: JournalEntry) {
    setSelected(entry)
    setMode('view')
    setMobileShowEditor(true)
  }

  function startEdit(entry: JournalEntry) {
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
    setSetup(entry.setup ?? '')
    setChartUrl(entry.chartUrl)
    setMode('edit')
  }

  async function handleSave() {
    if (!content.trim()) return
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
      setup: setup || null,
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
        const created = await res.json()
        setEntries(e => [created, ...e])
        setSelected(created)
        setMode('view')
      } else if (mode === 'edit' && selected) {
        const res = await fetch(`/api/journal/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || null, content, mood: mood || null, ...tradePayload }),
        })
        const updated = await res.json()
        setEntries(e => e.map(x => x.id === updated.id ? updated : x))
        setSelected(updated)
        setMode('view')
      }
    } finally {
      setSaving(false)
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
    if (mode === 'new') {
      setMode('view')
      setMobileShowEditor(false)
    } else {
      setMode('view')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">My Journal</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calendar" className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </Link>
          <Button variant="gold" size="sm" onClick={openNew} className="gap-1.5 text-xs">
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
        <JournalAnalytics entries={entries} />
      ) : (
      <div className="flex gap-4 h-[calc(100vh-13rem)]">
        {/* Entry list */}
        <div className={`flex flex-col w-full lg:w-72 shrink-0 bg-surface rounded-xl border border-line overflow-hidden ${mobileShowEditor ? 'hidden lg:flex' : 'flex'}`}>
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
              <div className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-line mx-auto mb-2" />
                <p className="text-xs text-ink3">No entries yet</p>
                <button onClick={openNew} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  Write your first entry →
                </button>
              </div>
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
                    {entry.pnl != null && (
                      <span className={`text-xs font-bold shrink-0 ${entry.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtMoney(entry.pnl)}</span>
                    )}
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
                      <span className="text-[10px] text-ink3 truncate">{setupLabel(entry.setup)}</span>
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
              <div className="p-4 border-b border-line flex items-center justify-between gap-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Entry title (optional)"
                  className="flex-1 bg-transparent text-ink font-semibold text-lg outline-none placeholder-line2"
                />
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={cancelEdit} className="text-xs gap-1">
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                  <Button variant="gold" size="sm" onClick={handleSave} loading={saving} className="text-xs gap-1">
                    <Check className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Mood picker */}
                <div className="px-4 py-2 border-b border-line flex gap-2 flex-wrap">
                  {moods.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMood(mood === m.value ? '' : m.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${mood === m.value ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'border-line text-ink3 hover:border-line2 hover:text-ink2'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {/* Trade details (optional) — powers the trading calendar */}
                <div className="px-4 py-3 border-b border-line space-y-3">
                  <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Trade details (optional) · shown on your calendar</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={symbol}
                      onChange={e => setSymbol(e.target.value)}
                      placeholder="Symbol (e.g. XAUUSD)"
                      className={`${fieldCls} uppercase`}
                    />
                    <input
                      type="date"
                      value={tradedAt}
                      onChange={e => setTradedAt(e.target.value)}
                      className={`${fieldCls} scheme-dark`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setDirection(direction === 'buy' ? '' : 'buy')}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${direction === 'buy' ? 'bg-green-400/10 border-green-400/50 text-green-400' : 'border-line text-ink3 hover:text-ink2'}`}>
                      ▲ Buy
                    </button>
                    <button onClick={() => setDirection(direction === 'sell' ? '' : 'sell')}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${direction === 'sell' ? 'bg-red-400/10 border-red-400/50 text-red-400' : 'border-line text-ink3 hover:text-ink2'}`}>
                      ▼ Sell
                    </button>
                    <span className="w-px bg-line mx-1" />
                    {results.map(r => (
                      <button key={r.value} onClick={() => setResult(result === r.value ? '' : r.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${result === r.value ? `bg-sunken border-line2 ${r.cls}` : 'border-line text-ink3 hover:text-ink2'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Setup — the shared vocabulary that makes the analytics comparable */}
                  <label className="block">
                    <span className="text-[10px] font-semibold text-ink3">Setup</span>
                    <select
                      value={setup}
                      onChange={e => setSetup(e.target.value)}
                      className={`${fieldCls} mt-1 w-full scheme-dark`}
                    >
                      <option value="">No setup tagged</option>
                      {SETUPS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </label>

                  {/* Prices — fill entry, exit and lots and the P&L computes itself */}
                  <div>
                    <p className="text-[10px] font-semibold text-ink3 mb-1">
                      Prices <span className="text-line2">· entry + exit + lots ⇒ P&amp;L; add a stop for R</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <PriceField label="Entry"  value={entryPrice}  onChange={setEntryPrice} />
                      <PriceField label="Exit"   value={exitPrice}   onChange={setExitPrice} />
                      <PriceField label="Lots"   value={lots}        onChange={setLots} placeholder="0.10" />
                      <PriceField label="Stop"   value={stopPrice}   onChange={setStopPrice} />
                      <PriceField label="Target" value={targetPrice} onChange={setTargetPrice} />
                    </div>
                  </div>

                  {/* P&L — derived from the prices when we have them, else typed */}
                  {trade.derived ? (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink3">P&amp;L</span>
                        <span className={`text-base font-black tabular-nums ${(trade.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtMoney(trade.pnl ?? 0)}
                        </span>
                        {trade.rMultiple != null && (
                          <span className={`text-xs font-bold tabular-nums rounded px-1.5 py-0.5 ${trade.rMultiple >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {fmtR(trade.rMultiple)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink3 mt-1">
                        Calculated from your prices.{' '}
                        {trade.rMultiple == null && 'Add a stop price to see this in R.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-ink3">P&L $</span>
                      <input
                        type="number"
                        step="any"
                        value={pnl}
                        onChange={e => setPnl(e.target.value)}
                        placeholder="e.g. 250 or -80"
                        className="w-32 bg-sunken border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-line2"
                      />
                      {result === 'loss' && (
                        <span className="text-[11px] text-red-400">Recorded as a loss ({fmtMoney(-Math.abs(Number(pnl) || 0))})</span>
                      )}
                      {result === 'win' && (
                        <span className="text-[11px] text-green-400">Recorded as a win ({fmtMoney(Math.abs(Number(pnl) || 0))})</span>
                      )}
                      {result !== 'loss' && result !== 'win' && (
                        <span className="text-[11px] text-ink3">Use a minus sign for a loss, e.g. -80</span>
                      )}
                    </div>
                  )}

                  <ChartUpload value={chartUrl} onChange={setChartUrl} label="Add chart screenshot (optional)" />
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your thoughts, trade notes, reflections…"
                  className="w-full min-h-48 bg-transparent text-ink text-sm outline-none resize-none p-4 placeholder-line2 leading-relaxed"
                />
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
                      {selected.setup && (
                        <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                          {setupLabel(selected.setup)}
                        </span>
                      )}
                      {selected.result && <span className="text-xs text-ink2">{results.find(r => r.value === selected.result)?.label}</span>}
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
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-line mx-auto mb-3" />
                <p className="text-ink3 text-sm">Select an entry or create a new one</p>
                <button onClick={openNew} className="mt-3 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  + New entry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
