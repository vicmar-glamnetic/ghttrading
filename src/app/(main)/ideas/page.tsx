'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  Lightbulb, Plus, Copy, Check, ArrowRight, Circle, CheckCircle2, XCircle,
  Globe, Lock, Pencil, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { PerformancePanel } from './PerformancePanel'

interface TakeProfit { price: number; pips?: number | null; hit?: boolean }
interface Author { id: string; name: string | null; image: string | null; username: string | null }
interface TradeIdea {
  id: string
  symbol: string
  direction: 'buy' | 'sell'
  entryLow: number | null
  entryHigh: number | null
  slLow: number | null
  slHigh: number | null
  takeProfits: TakeProfit[]
  currentPrice: number | null
  status: 'pending' | 'tp_hit' | 'sl_hit'
  notes: string | null
  isPublic: boolean
  authorId: string
  author: Author
  createdAt: string
}

type Tab = 'community' | 'mine' | 'stats'

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}
function fmtRange(low: number | null, high: number | null) {
  if (low == null && high == null) return '—'
  if (low != null && high != null && low !== high) return `${fmtNum(low)} – ${fmtNum(high)}`
  return fmtNum(low ?? high)
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// Build a clean order ticket to paste into MT5.
function mt5Ticket(idea: TradeIdea) {
  const lines = [
    `GHT Signal`,
    `Symbol: ${idea.symbol}`,
    `Type: ${idea.direction.toUpperCase()}`,
    `Entry: ${fmtRange(idea.entryLow, idea.entryHigh)}`,
    `SL: ${fmtRange(idea.slLow, idea.slHigh)}`,
    ...idea.takeProfits.map((tp, i) => `TP${i + 1}: ${fmtNum(tp.price)}`),
  ]
  return lines.join('\n')
}

/* ---------- copy button ---------- */
function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        } catch {}
      }}
      className={`shrink-0 text-ink3 hover:text-yellow-500 transition-colors ${className}`}
      title="Copy"
    >
      {done ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

/* ---------- idea card ---------- */
function IdeaCard({ idea, canManage, onEdit, onDelete }: {
  idea: TradeIdea
  canManage: boolean
  onEdit: (i: TradeIdea) => void
  onDelete: (i: TradeIdea) => void
}) {
  const isBuy = idea.direction === 'buy'
  return (
    <div className="bg-surface rounded-xl border border-line p-4 flex flex-col">
      {/* post header */}
      <div className="flex items-center gap-3">
        <Avatar src={idea.author.image} name={idea.author.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-ink text-sm truncate">{idea.author.name || 'Coach'}</span>
            <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-500 text-black rounded px-1.5 py-0.5 shrink-0">Signal</span>
          </div>
          <p className="text-xs text-ink3">
            <span className="font-semibold text-ink2">{idea.symbol}</span> · {timeAgo(idea.createdAt)}
          </p>
        </div>
        <span className={`text-xs font-black rounded px-2.5 py-1 shrink-0 ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'} ${idea.status === 'sl_hit' ? 'opacity-60' : ''}`}>
          {isBuy ? 'BUY' : 'SELL'}
        </span>
      </div>

      {/* live signal + status */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${idea.status === 'pending' ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
          <span className="text-sm font-bold text-blue-400">
            {idea.status === 'pending' ? 'LIVE' : 'Closed'}
          </span>
          <span className="text-sm font-semibold text-ink2">
            {idea.entryLow != null || idea.entryHigh != null ? fmtRange(idea.entryLow, idea.entryHigh) : ''}
          </span>
        </div>
        {idea.status === 'tp_hit' && <span className="text-xs font-semibold text-green-400 bg-green-400/10 rounded px-2 py-0.5">TP Hit</span>}
        {idea.status === 'sl_hit' && <span className="text-xs font-semibold text-red-400 bg-red-400/10 rounded px-2 py-0.5">SL Hit</span>}
        {idea.status === 'pending' && <span className="text-xs text-ink3 bg-sunken rounded px-2 py-0.5">Pending</span>}
      </div>

      {/* rows */}
      <div className="mt-3 divide-y divide-line border-t border-line">
        {/* entry */}
        <div className="flex items-center gap-3 py-2.5">
          <ArrowRight className="w-4 h-4 text-ink2 shrink-0" />
          <span className="text-sm font-semibold text-ink w-14 shrink-0">Entry</span>
          <span className="text-sm text-ink flex-1 tabular-nums">{fmtRange(idea.entryLow, idea.entryHigh)}</span>
          <CopyBtn text={fmtNum(idea.entryLow ?? idea.entryHigh)} />
        </div>
        {/* take profits */}
        {idea.takeProfits.map((tp, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            {tp.hit
              ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              : <Circle className="w-4 h-4 text-line2 shrink-0" />}
            <span className="text-sm font-semibold text-ink w-14 shrink-0">TP{i + 1}</span>
            <span className="text-sm text-green-400 flex-1 tabular-nums">
              {fmtNum(tp.price)}{tp.pips != null ? <span className="text-ink3"> / {tp.pips} pips</span> : null}
            </span>
            <CopyBtn text={fmtNum(tp.price)} />
          </div>
        ))}
        {/* stop loss */}
        {(idea.slLow != null || idea.slHigh != null) && (
          <div className="flex items-center gap-3 py-2.5">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm font-semibold text-ink w-14 shrink-0">SL</span>
            <span className="text-sm text-ink flex-1 tabular-nums">{fmtRange(idea.slLow, idea.slHigh)}</span>
            <CopyBtn text={fmtNum(idea.slLow ?? idea.slHigh)} />
          </div>
        )}
      </div>

      {idea.notes && <p className="text-xs text-ink2 mt-3 whitespace-pre-wrap">{idea.notes}</p>}

      {/* actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={async () => { try { await navigator.clipboard.writeText(mt5Ticket(idea)) } catch {} }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg py-2 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> Copy for MT5
        </button>
        {canManage && (
          <>
            <button onClick={() => onEdit(idea)} className="p-2 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-elevated transition-colors"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(idea)} className="p-2 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors"><Trash2 className="w-4 h-4" /></button>
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-line flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-ink3 shrink-0 mt-px" />
        <p className="text-[10px] text-ink3 leading-relaxed">
          Trading ideas shared are for educational purposes only, not financial advice. Trade at your own risk.
        </p>
      </div>
    </div>
  )
}

/* ---------- shorthand signal parser ----------
   Parses a pasted signal like:
     Buy now 4110-4105 buy more 4098 4001
     4115
     4120
     4125
     Sl 4088
   into { direction, entry range, take-profits, stop-loss, extra "buy more" levels }. */
function parseSignal(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const numRe = /\d+(?:\.\d+)?/g
  let direction: 'buy' | 'sell' | null = null
  const entries: number[] = []
  const more: number[] = []
  const tps: number[] = []
  const sls: number[] = []

  for (const line of lines) {
    const low = line.toLowerCase()
    const nums = (line.match(numRe) || []).map(Number)

    // Stop loss
    if (/\bsl\b|stop\s*loss/.test(low)) { sls.push(...nums); continue }

    // A number immediately followed by an emoji is an explicit take-profit.
    const emojiTps = [...line.matchAll(/(\d+(?:\.\d+)?)\s*\p{Extended_Pictographic}/gu)].map(m => Number(m[1]))
    if (emojiTps.length) { tps.push(...emojiTps); continue }

    // Entry / direction line(s)
    if (/buy|sell|entry|now|more/.test(low)) {
      if (/sell/.test(low)) direction = 'sell'
      else if (/buy/.test(low)) direction = direction ?? 'buy'
      const moreIdx = low.indexOf('more')
      if (moreIdx >= 0) {
        ;(line.slice(0, moreIdx).match(numRe) || []).forEach(n => entries.push(Number(n)))
        ;(line.slice(moreIdx).match(numRe) || []).forEach(n => more.push(Number(n)))
      } else {
        entries.push(...nums)
      }
      continue
    }

    // Otherwise a bare price line → take profit (also handles "TP1 4115")
    if (nums.length) tps.push(...nums)
  }

  const entryLow = entries.length ? Math.min(...entries) : null
  const entryHigh = entries.length ? Math.max(...entries) : null
  const slLow = sls.length ? Math.min(...sls) : null
  const slHigh = sls.length ? Math.max(...sls) : null

  return { direction, entryLow, entryHigh, slLow, slHigh, takeProfits: tps, moreEntries: more }
}

/* ---------- editor modal ---------- */
const EMPTY = {
  symbol: 'XAUUSD', direction: 'buy' as 'buy' | 'sell', entryLow: '', entryHigh: '',
  slLow: '', slHigh: '', currentPrice: '', status: 'pending' as TradeIdea['status'],
  notes: '', isPublic: true,
  takeProfits: [{ price: '', pips: '', hit: false }] as { price: string; pips: string; hit: boolean }[],
}

function IdeaEditor({ initial, onClose, onSaved }: {
  initial: TradeIdea | null
  onClose: () => void
  onSaved: (i: TradeIdea, isNew: boolean) => void
}) {
  const [f, setF] = useState(() => {
    if (!initial) return EMPTY
    return {
      symbol: initial.symbol,
      direction: initial.direction,
      entryLow: initial.entryLow?.toString() ?? '',
      entryHigh: initial.entryHigh?.toString() ?? '',
      slLow: initial.slLow?.toString() ?? '',
      slHigh: initial.slHigh?.toString() ?? '',
      currentPrice: initial.currentPrice?.toString() ?? '',
      status: initial.status,
      notes: initial.notes ?? '',
      isPublic: initial.isPublic,
      takeProfits: initial.takeProfits.length
        ? initial.takeProfits.map(t => ({ price: t.price?.toString() ?? '', pips: t.pips?.toString() ?? '', hit: !!t.hit }))
        : [{ price: '', pips: '', hit: false }],
    }
  })
  const [saving, setSaving] = useState(false)
  const [paste, setPaste] = useState('')

  // Parse a pasted shorthand signal and fill the form.
  function applyPaste() {
    if (!paste.trim()) return
    const p = parseSignal(paste)
    setF(s => ({
      ...s,
      direction: p.direction ?? s.direction,
      entryLow: p.entryLow != null ? String(p.entryLow) : s.entryLow,
      entryHigh: p.entryHigh != null && p.entryHigh !== p.entryLow ? String(p.entryHigh) : '',
      slLow: p.slLow != null ? String(p.slLow) : s.slLow,
      slHigh: p.slHigh != null && p.slHigh !== p.slLow ? String(p.slHigh) : '',
      takeProfits: p.takeProfits.length
        ? p.takeProfits.map(n => ({ price: String(n), pips: '', hit: false }))
        : s.takeProfits,
      notes: p.moreEntries.length
        ? `${s.notes ? s.notes + '\n' : ''}Add more: ${p.moreEntries.join(', ')}`
        : s.notes,
    }))
  }

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF(s => ({ ...s, [k]: v })) }
  function setTp(i: number, patch: Partial<{ price: string; pips: string; hit: boolean }>) {
    setF(s => ({ ...s, takeProfits: s.takeProfits.map((t, idx) => idx === i ? { ...t, ...patch } : t) }))
  }

  async function save() {
    if (!f.symbol.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...f,
        takeProfits: f.takeProfits
          .filter(t => t.price.trim() !== '')
          .map(t => ({ price: Number(t.price), pips: t.pips.trim() === '' ? null : Number(t.pips), hit: t.hit })),
      }
      const res = await fetch(initial ? `/api/ideas/${initial.id}` : '/api/ideas', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) onSaved(await res.json(), !initial)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'bg-sunken border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-line2 w-full'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-line max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface flex items-center justify-between p-4 border-b border-line z-10">
          <h2 className="font-bold text-ink">{initial ? 'Edit Signal' : 'New Signal'}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick paste — type/paste a signal and auto-fill */}
          <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-3">
            <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">⚡ Quick paste signal</label>
            <textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              rows={4}
              placeholder={"Buy now 4110-4105 buy more 4098 4001\n4115\n4120\n4125\nSl 4088"}
              className={`${inputCls} mt-1.5 resize-none font-mono text-xs`}
            />
            <button
              onClick={applyPaste}
              className="mt-2 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-1.5 transition-colors"
            >
              Parse &amp; fill ↓
            </button>
            <span className="ml-2 text-[10px] text-ink3">Fills the fields below — review, then post.</span>
          </div>

          {/* symbol + direction */}
          <div className="grid grid-cols-2 gap-2">
            <input value={f.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="Symbol (e.g. BTCUSD)" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={() => set('direction', 'buy')} className={`flex-1 rounded-lg text-sm font-bold transition-colors ${f.direction === 'buy' ? 'bg-green-500 text-black' : 'bg-sunken border border-line text-ink3'}`}>BUY</button>
              <button onClick={() => set('direction', 'sell')} className={`flex-1 rounded-lg text-sm font-bold transition-colors ${f.direction === 'sell' ? 'bg-red-500 text-white' : 'bg-sunken border border-line text-ink3'}`}>SELL</button>
            </div>
          </div>

          {/* entry range */}
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Entry (range or single)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={f.entryLow} onChange={e => set('entryLow', e.target.value)} placeholder="From" type="number" step="any" className={inputCls} />
              <input value={f.entryHigh} onChange={e => set('entryHigh', e.target.value)} placeholder="To (optional)" type="number" step="any" className={inputCls} />
            </div>
          </div>

          {/* take profits */}
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Take Profits</label>
            <div className="space-y-2 mt-1">
              {f.takeProfits.map((tp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink2 w-8 shrink-0">TP{i + 1}</span>
                  <input value={tp.price} onChange={e => setTp(i, { price: e.target.value })} placeholder="Price" type="number" step="any" className={inputCls} />
                  <input value={tp.pips} onChange={e => setTp(i, { pips: e.target.value })} placeholder="Pips" type="number" step="any" className={`${inputCls} w-20`} />
                  <button onClick={() => setTp(i, { hit: !tp.hit })} title="Mark hit" className={`p-1.5 rounded-lg shrink-0 ${tp.hit ? 'text-green-400' : 'text-line2 hover:text-ink3'}`}>
                    {tp.hit ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => set('takeProfits', f.takeProfits.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg text-ink3 hover:text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => set('takeProfits', [...f.takeProfits, { price: '', pips: '', hit: false }])} className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add TP</button>
            </div>
          </div>

          {/* stop loss range */}
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Stop Loss (range or single)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={f.slLow} onChange={e => set('slLow', e.target.value)} placeholder="From" type="number" step="any" className={inputCls} />
              <input value={f.slHigh} onChange={e => set('slHigh', e.target.value)} placeholder="To (optional)" type="number" step="any" className={inputCls} />
            </div>
          </div>

          {/* current price + status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Current price</label>
              <input value={f.currentPrice} onChange={e => set('currentPrice', e.target.value)} placeholder="optional" type="number" step="any" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Status</label>
              <select value={f.status} onChange={e => set('status', e.target.value as TradeIdea['status'])} className={`${inputCls} mt-1 scheme-dark`}>
                <option value="pending">Pending</option>
                <option value="tp_hit">TP Hit</option>
                <option value="sl_hit">SL Hit</option>
              </select>
            </div>
          </div>

          <textarea value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes / rationale (optional)" rows={2} className={`${inputCls} resize-none`} />

          {/* visibility */}
          <div className="flex items-center gap-2">
            <button onClick={() => set('isPublic', false)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${!f.isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Lock className="w-3.5 h-3.5" /> Private</button>
            <button onClick={() => set('isPublic', true)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${f.isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Globe className="w-3.5 h-3.5" /> Public</button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">{initial ? 'Save' : 'Post Idea'}</Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- page ---------- */
export default function IdeasPage() {
  const { data: session } = useSession()
  const uid = session?.user?.id
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'
  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('community')
  const [editor, setEditor] = useState<{ open: boolean; idea: TradeIdea | null }>({ open: false, idea: null })

  const load = useCallback(async (t: Tab) => {
    if (t === 'stats') return
    setLoading(true)
    try {
      const res = await fetch(`/api/ideas?scope=${t === 'mine' ? 'mine' : 'community'}`)
      const data = await res.json()
      setIdeas(Array.isArray(data) ? data : [])
    } catch {
      setIdeas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function handleDelete(idea: TradeIdea) {
    if (!confirm('Delete this signal?')) return
    setIdeas(prev => prev.filter(i => i.id !== idea.id))
    await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' })
  }

  function handleSaved(saved: TradeIdea, isNew: boolean) {
    setEditor({ open: false, idea: null })
    setIdeas(prev => {
      const next = isNew ? [saved, ...prev] : prev.map(i => i.id === saved.id ? saved : i)
      // drop it from the community view if it was just made private
      return next.filter(i => tab === 'mine' || i.isPublic || i.authorId === uid)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">Signals</h1>
        </div>
        {isStaff && (
          <Button variant="gold" size="sm" onClick={() => setEditor({ open: true, idea: null })} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Signal
          </Button>
        )}
      </div>

      {/* tabs — Results (performance) is visible to everyone; coaches also get a personal list */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {(([['community', 'Community'], ...(isStaff ? [['mine', 'My Signals']] as [Tab, string][] : []), ['stats', 'Results']]) as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' ? (
        <PerformancePanel />
      ) : loading ? (
        <div className="space-y-4 max-w-xl mx-auto">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-surface rounded-xl border border-line animate-pulse" />)}
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center max-w-xl mx-auto">
          <Lightbulb className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-ink3">
            {tab === 'mine'
              ? 'You have no signals yet.'
              : isStaff ? 'No signals yet. Post the first one!' : 'No signals yet — check back soon.'}
          </p>
          {isStaff && (
            <button onClick={() => setEditor({ open: true, idea: null })} className="mt-3 text-sm text-yellow-500 hover:text-yellow-400">+ New signal</button>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-xl mx-auto">
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              canManage={isStaff}
              onEdit={i => setEditor({ open: true, idea: i })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editor.open && (
        <IdeaEditor
          initial={editor.idea}
          onClose={() => setEditor({ open: false, idea: null })}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
