'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  Lightbulb, Plus, Copy, Check, ArrowRight, Circle, CheckCircle2, XCircle,
  Globe, Lock, Pencil, Trash2, X, AlertTriangle,
} from 'lucide-react'

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

type Tab = 'community' | 'mine'

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}
function fmtRange(low: number | null, high: number | null) {
  if (low == null && high == null) return '—'
  if (low != null && high != null && low !== high) return `${fmtNum(low)} – ${fmtNum(high)}`
  return fmtNum(low ?? high)
}

// Build a clean order ticket to paste into MT5.
function mt5Ticket(idea: TradeIdea) {
  const lines = [
    `GHT Trade Idea`,
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
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-500 text-black rounded px-1.5 py-0.5">Trade Idea</span>
          <Avatar src={idea.author.image} name={idea.author.name} size="xs" />
          <span className="font-bold text-ink truncate">{idea.symbol}</span>
        </div>
        <span className={`text-xs font-black rounded px-2 py-0.5 ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'} ${idea.status === 'sl_hit' ? 'opacity-60' : ''}`}>
          {isBuy ? 'BUY' : 'SELL'}
        </span>
      </div>

      {/* price + status */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-sm font-bold text-blue-400">
            {idea.currentPrice != null ? `$${fmtNum(idea.currentPrice)}` : '--'}
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

/* ---------- editor modal ---------- */
const EMPTY = {
  symbol: '', direction: 'buy' as 'buy' | 'sell', entryLow: '', entryHigh: '',
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
          <h2 className="font-bold text-ink">{initial ? 'Edit Trade Idea' : 'New Trade Idea'}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
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
    if (!confirm('Delete this trade idea?')) return
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
          <h1 className="font-bold text-ink text-lg">Trade Ideas</h1>
        </div>
        {isStaff && (
          <Button variant="gold" size="sm" onClick={() => setEditor({ open: true, idea: null })} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Idea
          </Button>
        )}
      </div>

      {/* tabs — only coaches/admins have a personal list */}
      {isStaff && (
        <div className="flex gap-2">
          {([['community', 'Community'], ['mine', 'My Ideas']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-surface rounded-xl border border-line animate-pulse" />)}
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <Lightbulb className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
          <p className="text-ink3">
            {tab === 'mine'
              ? 'You have no trade ideas yet.'
              : isStaff ? 'No community ideas yet. Be the first to share one!' : 'No trade ideas yet — check back soon.'}
          </p>
          {isStaff && (
            <button onClick={() => setEditor({ open: true, idea: null })} className="mt-3 text-sm text-yellow-500 hover:text-yellow-400">+ New idea</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              canManage={idea.authorId === uid}
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
