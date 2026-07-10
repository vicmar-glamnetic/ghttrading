'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  Lightbulb, Plus, Copy, Check, ArrowRight, Circle, CheckCircle2, XCircle,
  Globe, Lock, Pencil, Trash2, X, AlertTriangle, ThumbsUp, ThumbsDown, RotateCcw,
  GraduationCap,
} from 'lucide-react'
import { PerformancePanel } from './PerformancePanel'
import { liveSignalStatus, signalPips, positionSize } from '@/lib/trading'

interface TakeProfit { price: number; pips?: number | null; hit?: boolean }
interface Author { id: string; name: string | null; image: string | null; username: string | null }
interface Votes { take: number; skip: number; mine: 'take' | 'skip' | null }
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
  status: 'pending' | 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled'
  notes: string | null
  isPublic: boolean
  authorId: string
  author: Author
  createdAt: string
  votes?: Votes
}

interface Acct { balance: number; riskPct: number }
function loadAcctCache(): Acct | null {
  try { const r = localStorage.getItem('ght:acct'); return r ? JSON.parse(r) : null } catch { return null }
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

/* ---------- live price (ticks + flashes up/down) ---------- */
function LivePrice({ price }: { price: number }) {
  const prev = useRef(price)
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (price > prev.current) setDir('up')
    else if (price < prev.current) setDir('down')
    prev.current = price
    const t = setTimeout(() => setDir(null), 700)
    return () => clearTimeout(t)
  }, [price])
  const color = dir === 'up' ? 'text-green-400' : dir === 'down' ? 'text-red-400' : 'text-ink3'
  return (
    <span className={`text-xs tabular-nums truncate transition-colors duration-500 ${color}`}>
      · now {price.toFixed(2)}
      {dir && <span className="ml-0.5">{dir === 'up' ? '▲' : '▼'}</span>}
    </span>
  )
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
const TONE: Record<string, string> = {
  green: 'text-green-400 bg-green-400/10 border-green-400/20',
  amber: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
  slate: 'text-ink2 bg-elevated border-line',
  void: 'text-ink3 bg-sunken border-line border-dashed line-through',
}

type CloseStatus = 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled' | 'pending'

function IdeaCard({ idea, canManage, onEdit, onDelete, onClose, price, acct }: {
  idea: TradeIdea
  canManage: boolean
  onEdit: (i: TradeIdea) => void
  onDelete: (i: TradeIdea) => void
  onClose: (i: TradeIdea, status: CloseStatus) => void
  price: number | null
  acct: Acct | null
}) {
  const isBuy = idea.direction === 'buy'
  const [votes, setVotes] = useState<Votes>(idea.votes ?? { take: 0, skip: 0, mine: null })
  const [closing, setClosing] = useState(false)

  const isGold = idea.symbol.toUpperCase().startsWith('XAU')
  const live = liveSignalStatus(idea, isGold ? price : null)
  const pips = signalPips(idea)

  // Partial progress: TPs already hit while the signal is still running.
  const hitCount = idea.takeProfits.filter(t => t.hit).length
  const tpTotal = idea.takeProfits.length
  const inProfit = idea.status === 'pending' && hitCount > 0

  // Auto position size from the member's saved account + this signal's entry/SL.
  const entryMid = idea.entryLow != null && idea.entryHigh != null ? (idea.entryLow + idea.entryHigh) / 2 : (idea.entryLow ?? idea.entryHigh)
  const slMid = idea.slLow != null && idea.slHigh != null ? (idea.slLow + idea.slHigh) / 2 : (idea.slLow ?? idea.slHigh)
  const size = acct && entryMid != null && slMid != null
    ? positionSize({ balance: acct.balance, riskPct: acct.riskPct, entry: entryMid, sl: slMid, symbol: idea.symbol })
    : null

  async function vote(v: 'take' | 'skip') {
    const prev = votes
    // optimistic
    const next: Votes = { take: votes.take, skip: votes.skip, mine: votes.mine }
    if (votes.mine) next[votes.mine]--
    if (votes.mine === v) next.mine = null
    else { next[v]++; next.mine = v }
    setVotes(next)
    try {
      const res = await fetch(`/api/ideas/${idea.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vote: v }) })
      if (res.ok) setVotes(await res.json())
      else setVotes(prev)
    } catch { setVotes(prev) }
  }
  const totalVotes = votes.take + votes.skip
  const takePct = totalVotes ? Math.round((votes.take / totalVotes) * 100) : 0

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
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${idea.status === 'pending' ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
          <span className="text-sm font-bold text-blue-400 shrink-0">
            {idea.status === 'pending' ? (inProfit ? 'RUNNING' : 'LIVE') : idea.status === 'cancelled' ? 'Cancelled' : 'Closed'}
          </span>
          {isGold && price != null && idea.status === 'pending' && (
            <LivePrice price={price} />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pips != null && (
            <span className={`text-xs font-bold rounded px-2 py-0.5 ${pips >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
              {pips >= 0 ? `+${pips}` : pips} pips
            </span>
          )}
          {inProfit ? (
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 border text-green-400 bg-green-400/10 border-green-400/20">
              🟢 In profit · TP{hitCount}{tpTotal > 1 ? `/${tpTotal}` : ''} hit
            </span>
          ) : live ? (
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${TONE[live.tone]}`}>
              {live.dot} {live.label}
            </span>
          ) : idea.status === 'pending' ? (
            <span className="text-xs text-ink3 bg-sunken rounded px-2 py-0.5">Pending</span>
          ) : null}
        </div>
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

      {/* auto position size */}
      {size && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-sunken border border-line px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink3">Your size</span>
          <span className="text-sm font-bold text-yellow-500 tabular-nums">{size.lots.toFixed(2)} lots</span>
          <span className="text-[11px] text-ink3">· ${acct!.balance.toLocaleString()} @ {acct!.riskPct}% · {Math.round(size.stopPips)} pip SL</span>
        </div>
      )}

      {idea.notes && <p className="text-xs text-ink2 mt-3 whitespace-pre-wrap">{idea.notes}</p>}

      {/* community sentiment (open signals) */}
      {idea.status === 'pending' && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-2">
            <button onClick={() => vote('take')}
              className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors ${votes.mine === 'take' ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-ink2 border-line hover:bg-elevated'}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> Taking {votes.take > 0 && votes.take}
            </button>
            <button onClick={() => vote('skip')}
              className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors ${votes.mine === 'skip' ? 'text-red-400 bg-red-400/10 border-red-400/30' : 'text-ink2 border-line hover:bg-elevated'}`}>
              <ThumbsDown className="w-3.5 h-3.5" /> Skipping {votes.skip > 0 && votes.skip}
            </button>
            {totalVotes > 0 && (
              <span className="ml-auto text-[11px] text-ink3">{takePct}% taking · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            )}
          </div>
          {totalVotes > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-elevated overflow-hidden flex">
              <div className="bg-green-500" style={{ width: `${takePct}%` }} />
              <div className="bg-red-500/70" style={{ width: `${100 - takePct}%` }} />
            </div>
          )}
        </div>
      )}

      {/* close-outcome menu (staff, running signals) */}
      {canManage && idea.status === 'pending' && closing && (
        <div className="mt-3 rounded-lg border border-line bg-sunken p-2">
          <p className="text-[11px] font-bold text-ink3 uppercase tracking-wider mb-2 px-1">Close signal as…</p>
          <div className="flex items-center gap-2">
            <button onClick={() => { onClose(idea, 'tp_hit'); setClosing(false) }}
              className="flex-1 text-xs font-bold rounded-lg py-2 text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-colors">✅ Win (TP)</button>
            <button onClick={() => { onClose(idea, 'sl_hit'); setClosing(false) }}
              className="flex-1 text-xs font-bold rounded-lg py-2 text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors">🔴 Loss (SL)</button>
            <button onClick={() => { onClose(idea, 'breakeven'); setClosing(false) }}
              className="flex-1 text-xs font-bold rounded-lg py-2 text-ink2 bg-elevated border border-line hover:bg-line/40 transition-colors">⚪ Breakeven</button>
          </div>
          <div className="flex items-stretch gap-2 mt-2">
            <button onClick={() => { onClose(idea, 'closed'); setClosing(false) }}
              className="flex-1 rounded-lg py-2 px-1 text-ink2 bg-elevated border border-line hover:bg-line/40 transition-colors">
              <span className="block text-xs font-bold">⚫ Closed manually</span>
              <span className="block text-[10px] text-ink3 mt-0.5">Trade taken, ended flat</span>
            </button>
            <button onClick={() => { onClose(idea, 'cancelled'); setClosing(false) }}
              className="flex-1 rounded-lg py-2 px-1 text-ink3 bg-sunken border border-dashed border-line hover:bg-elevated transition-colors">
              <span className="block text-xs font-bold">🚫 Cancelled</span>
              <span className="block text-[10px] text-ink3 mt-0.5">Never entered</span>
            </button>
          </div>
          <button onClick={() => setClosing(false)} className="mt-2 w-full text-[11px] text-ink3 hover:text-ink2 py-1">Cancel</button>
        </div>
      )}

      {/* actions (staff manage controls; members use the per-level copy buttons above) */}
      {canManage && (
        <div className="mt-3 flex items-center gap-2">
          {idea.status === 'pending' ? (
            <button onClick={() => setClosing(v => !v)} title="Close signal"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-ink2 border border-line hover:text-red-400 hover:border-red-400/40 hover:bg-elevated transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Close signal
            </button>
          ) : (
            <button onClick={() => onClose(idea, 'pending')} title="Mark this signal as live again"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-ink2 border border-line hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Mark as Live
            </button>
          )}
          <button onClick={() => onEdit(idea)} title="Edit signal"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-ink2 border border-line hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete(idea)} title="Delete signal" className="p-2 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}

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
   Handles both the freeform shorthand:
     Buy now 4110-4105 buy more 4098 4001
     4115
     Sl 4088
   and the labeled format:
     🚨XAUUSD SELL LIMIT🚨
     EP: 4125
     Sl: 4117
     Tp1: 4120
     Tp2: 4115
   → { symbol, direction, entry range, stop-loss, take-profits, extra "buy more" levels }. */
const numsIn = (s: string) => (s.match(/\d+(?:\.\d+)?/g) || []).map(Number)
// Common instrument tickers (won't match plain words like "SIGNAL"/"LIMIT").
const SYMBOL_RE = /\b(XAU[A-Z]{2,3}|XAG[A-Z]{2,3}|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|XAU|XAG)(?:USD|JPY|EUR|GBP|CHF|CAD|AUD|NZD)|BTC[A-Z]{0,4}|ETH[A-Z]{0,4}|US30|US500|NAS100|GER40|UK100|SPX500)\b/

function parseSignal(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let direction: 'buy' | 'sell' | null = null
  let symbol: string | null = null
  const entries: number[] = []
  const more: number[] = []
  const tps: number[] = []
  const sls: number[] = []

  for (const line of lines) {
    const low = line.toLowerCase()

    // Skip disclaimer / noise lines.
    if (/disclaimer|financial advice|risk manage/.test(low)) continue

    // Symbol (from a header line), detected once.
    if (!symbol) {
      const m = line.toUpperCase().replace(/[^A-Z0-9/ ]/g, ' ').match(SYMBOL_RE)
      if (m) symbol = m[1]
    }

    // Direction — any line mentioning buy/sell.
    if (/\bsell\b/.test(low)) direction = 'sell'
    else if (/\bbuy\b/.test(low)) direction = direction ?? 'buy'

    // Take profit: "tp", "tp1", "take profit N", "target" (label number ignored).
    const tp = low.match(/\b(?:tp|take\s*profit|target)\s*\d*\s*[:=.\-]?\s*(.+)$/)
    if (tp) { const v = numsIn(tp[1]); if (v.length) { tps.push(...v); continue } }

    // Stop loss: "sl", "s/l", "stop loss".
    const sl = low.match(/\b(?:sl|s\/l|stop\s*loss)\s*[:=.\-]?\s*(.+)$/)
    if (sl) { const v = numsIn(sl[1]); if (v.length) { sls.push(...v); continue } }

    // Entry: "ep", "entry", "entry price".
    const ep = low.match(/\b(?:ep|entry\s*price|entry)\s*[:=.\-]?\s*(.+)$/)
    if (ep) { const v = numsIn(ep[1]); if (v.length) { entries.push(...v); continue } }

    // A number immediately followed by an emoji is an explicit take-profit.
    const emojiTps = [...line.matchAll(/(\d+(?:\.\d+)?)\s*\p{Extended_Pictographic}/gu)].map(m => Number(m[1]))
    if (emojiTps.length) { tps.push(...emojiTps); continue }

    // Freeform entry / "buy more" line.
    if (/buy|sell|entry|now|more/.test(low)) {
      const moreIdx = low.indexOf('more')
      if (moreIdx >= 0) {
        numsIn(line.slice(0, moreIdx)).forEach(n => entries.push(n))
        numsIn(line.slice(moreIdx)).forEach(n => more.push(n))
      } else {
        entries.push(...numsIn(line))
      }
      continue
    }

    // Otherwise a bare price line → take profit.
    const bare = numsIn(line)
    if (bare.length) tps.push(...bare)
  }

  const entryLow = entries.length ? Math.min(...entries) : null
  const entryHigh = entries.length ? Math.max(...entries) : null
  const slLow = sls.length ? Math.min(...sls) : null
  const slHigh = sls.length ? Math.max(...sls) : null

  return { symbol, direction, entryLow, entryHigh, slLow, slHigh, takeProfits: tps, moreEntries: more }
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
      symbol: p.symbol ?? s.symbol,
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
                <option value="breakeven">Breakeven</option>
                <option value="closed">Closed manually</option>
                <option value="cancelled">Cancelled</option>
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
/* ---------- auto-size account bar ---------- */
function AccountBar({ acct, open, setOpen, onSave, onClear }: {
  acct: Acct | null; open: boolean; setOpen: (v: boolean) => void
  onSave: (a: Acct) => void; onClear: () => void
}) {
  const [bal, setBal] = useState(String(acct?.balance ?? ''))
  const [risk, setRisk] = useState(String(acct?.riskPct ?? '1'))
  useEffect(() => { if (open) { setBal(String(acct?.balance ?? '')); setRisk(String(acct?.riskPct ?? '1')) } }, [open, acct])

  if (!open) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        {acct ? (
          <>
            <span className="text-xs text-ink2">📐 Auto-sizing at <b className="text-ink">${acct.balance.toLocaleString()}</b> · <b className="text-ink">{acct.riskPct}%</b> risk</span>
            <button onClick={() => setOpen(true)} className="ml-auto text-xs font-semibold text-yellow-500 hover:text-yellow-400">Edit</button>
          </>
        ) : (
          <>
            <span className="text-xs text-ink3">Set your account to see <b className="text-ink2">your exact lot size</b> on each signal</span>
            <button onClick={() => setOpen(true)} className="ml-auto text-xs font-semibold text-yellow-500 hover:text-yellow-400 shrink-0">Set up →</button>
          </>
        )}
      </div>
    )
  }
  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-yellow-500/40'
  return (
    <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Auto position size</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-ink3 block mb-1">Account balance ($)</label>
          <input type="number" inputMode="decimal" value={bal} onChange={e => setBal(e.target.value)} placeholder="1000" className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] text-ink3 block mb-1">Risk per trade (%)</label>
          <input type="number" inputMode="decimal" value={risk} onChange={e => setRisk(e.target.value)} placeholder="1" className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => { const b = Number(bal), r = Number(risk); if (b > 0 && r > 0) onSave({ balance: b, riskPct: r }) }}
          className="text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-1.5 transition-colors">Save</button>
        {acct && <button onClick={onClear} className="text-xs font-semibold text-ink3 hover:text-red-400 px-2 py-1.5">Turn off</button>}
        <button onClick={() => setOpen(false)} className="ml-auto text-xs text-ink3 hover:text-ink2 px-2 py-1.5">Cancel</button>
      </div>
      <p className="text-[10px] text-ink3">Saved on this device only — never sent to us. Uses each signal&rsquo;s entry &amp; stop.</p>
    </div>
  )
}

// How-to popup shown to coaches/staff only. Explains the manual signal workflow
// so every coach closes and manages ideas consistently. Opened from the "Guide"
// button beside New Signal.
function CoachGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-line max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <GraduationCap className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-sm font-bold text-ink flex-1">Coach guide · how signals work</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-500 text-black rounded px-1.5 py-0.5">Coaches only</span>
          <button onClick={onClose} className="text-ink3 hover:text-ink ml-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4 text-sm text-ink2">
          <section>
            <h3 className="font-bold text-ink mb-1">Posting a signal</h3>
            <p className="text-ink3 leading-relaxed">
              Tap <span className="font-semibold text-ink2">New Signal</span> and set the symbol, direction, entry
              (a single price or a zone), one or more take-profits, and your stop. You can type the whole thing in
              shorthand — e.g. <span className="font-mono text-[12px] text-ink2">Buy 4110-4105 / TP 4115 4001 / Sl 4088</span> —
              and it auto-fills. Add notes for your reasoning. New signals go <span className="font-semibold text-ink2">LIVE</span> automatically.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-ink mb-1">Status &amp; closing (all manual)</h3>
            <p className="text-ink3 leading-relaxed mb-2">
              Nothing auto-closes anymore — <span className="font-semibold text-ink2">you</span> set the outcome. Tap
              <span className="font-semibold text-ink2"> Close signal</span> and pick one:
            </p>
            <ul className="space-y-1.5 text-ink3">
              <li><span className="text-green-400 font-semibold">✅ Win (TP)</span> — target hit. <span className="text-ink2">Counts as a win.</span></li>
              <li><span className="text-red-400 font-semibold">🔴 Loss (SL)</span> — stop hit. <span className="text-ink2">Counts as a loss.</span></li>
              <li><span className="text-ink2 font-semibold">⚪ Breakeven</span> — closed at entry, no gain/loss. <span className="text-ink2">Neutral.</span></li>
              <li><span className="text-ink2 font-semibold">⚫ Closed manually</span> — you <span className="text-ink2 font-semibold">entered</span> then closed by hand before TP/SL. <span className="text-ink2">Neutral.</span></li>
              <li><span className="text-ink3 font-semibold">🚫 Cancelled</span> — trade <span className="text-ink2 font-semibold">never triggered</span> (didn&rsquo;t reach entry / called off). <span className="text-ink2">Neutral.</span></li>
            </ul>
            <p className="text-[12px] text-ink3 leading-relaxed mt-2 rounded-lg bg-sunken border border-line px-3 py-2">
              <span className="font-bold text-ink2">Only Win (TP) and Loss (SL) affect win-rate.</span> Breakeven,
              Closed manually, and Cancelled are neutral — they never move your stats. Rule of thumb: <span className="italic">did we
              actually enter?</span> Yes → Closed manually · No → Cancelled.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-ink mb-1">Managing a live signal</h3>
            <ul className="space-y-1.5 text-ink3">
              <li><span className="font-semibold text-ink2">Edit</span> — adjust entry/TP/SL while running (e.g. move SL to breakeven after TP1, or tick a TP that hit).</li>
              <li><span className="font-semibold text-ink2">Mark as Live</span> — reopen a closed signal back to LIVE if you closed it by mistake.</li>
              <li><span className="font-semibold text-ink2">Delete</span> — remove a signal entirely.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-ink mb-1">Good to know</h3>
            <ul className="space-y-1.5 text-ink3">
              <li>Members see an <span className="font-semibold text-ink2">auto position size</span> (lots) from their own balance &amp; risk %, plus one-tap <span className="font-semibold text-ink2">copy</span> buttons for each price.</li>
              <li>Closing as <span className="font-semibold text-ink2">Win (TP)</span> sends a push to the whole community — so update outcomes promptly.</li>
              <li>Stats, the coach leaderboard, and the Monday weekly recap are all computed automatically from your closed signals.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const { data: session } = useSession()
  const uid = session?.user?.id
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'
  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('community')
  const [editor, setEditor] = useState<{ open: boolean; idea: TradeIdea | null }>({ open: false, idea: null })
  const [price, setPrice] = useState<number | null>(null)
  const [acct, setAcct] = useState<Acct | null>(null)
  const [showAcct, setShowAcct] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Load account prefs: instant from cache, then sync from the server (cross-device).
  useEffect(() => {
    setAcct(loadAcctCache())
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d?.acctBalance != null && d?.acctRiskPct != null) {
        const a = { balance: d.acctBalance, riskPct: d.acctRiskPct }
        setAcct(a)
        localStorage.setItem('ght:acct', JSON.stringify(a))
      }
    }).catch(() => {})
  }, [])

  const saveAcct = useCallback((a: Acct | null) => {
    setAcct(a)
    setShowAcct(false)
    if (a) localStorage.setItem('ght:acct', JSON.stringify(a)); else localStorage.removeItem('ght:acct')
    fetch('/api/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acctBalance: a?.balance ?? null, acctRiskPct: a?.riskPct ?? null }),
    }).catch(() => {})
  }, [])

  // Live gold price for the "still enterable?" status — polled every 2s so it
  // ticks near-live, paused when the tab is hidden to save requests/battery.
  useEffect(() => {
    const poll = () => {
      if (document.hidden) return
      fetch('/api/price?symbol=XAUUSD').then(r => r.json()).then(d => { if (typeof d.price === 'number') setPrice(d.price) }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
    document.addEventListener('visibilitychange', poll) // refresh immediately when tab refocuses
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', poll) }
  }, [])

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

  async function handleClose(idea: TradeIdea, status: CloseStatus) {
    const prev = idea.status
    // optimistic
    setIdeas(list => list.map(i => i.id === idea.id ? { ...i, status } : i))
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('close failed')
    } catch {
      setIdeas(list => list.map(i => i.id === idea.id ? { ...i, status: prev } : i))
    }
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGuide(true)} title="Coach guide"
              className="flex items-center gap-1.5 text-xs font-bold text-ink2 border border-line rounded-lg px-3 py-1.5 hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
              <GraduationCap className="w-3.5 h-3.5" /> Guide
            </button>
            <Button variant="gold" size="sm" onClick={() => setEditor({ open: true, idea: null })} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Signal
            </Button>
          </div>
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

      {isStaff && showGuide && <CoachGuide onClose={() => setShowGuide(false)} />}

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
          {/* auto position-size account bar */}
          <AccountBar acct={acct} open={showAcct} setOpen={setShowAcct} onSave={saveAcct} onClear={() => saveAcct(null)} />
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              canManage={isStaff}
              onEdit={i => setEditor({ open: true, idea: i })}
              onDelete={handleDelete}
              onClose={handleClose}
              price={price}
              acct={acct}
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
