'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  Lightbulb, Plus, Copy, Check, ArrowRight, Circle, CheckCircle2, XCircle,
  Globe, Lock, Pencil, Trash2, X, AlertTriangle, ThumbsUp, ThumbsDown, RotateCcw,
  GraduationCap, SlidersHorizontal, ChevronDown, Activity, Bell, NotebookPen,
  Send, MessageCircle, Hash, Square, CheckSquare,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PerformancePanel } from './PerformancePanel'
import { ChartUpload } from '@/components/trading/ChartUpload'
import { RiskGuard } from '@/components/trading/RiskGuard'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { liveSignalStatus, signalOutcome, signalPips, positionSize, pipConfig, pipUnit, mid, TP1_WIN_MIN_PIPS } from '@/lib/trading'
import { normalizeSymbol, isPriceable } from '@/lib/symbols'
import { formatSignalText } from '@/lib/signalRelay'
import { parseSignal } from '@/lib/signalParse'

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
  status: 'pending' | 'running' | 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled'
  notes: string | null
  chartUrl: string | null
  zoneAlert?: boolean   // am I watching this signal's entry zone?
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
type DirFilter = 'all' | 'buy' | 'sell'
type StatusFilter = 'all' | 'live' | 'win' | 'loss'
type MetalFilter = 'all' | 'gold' | 'other'

const isGoldSymbol = (symbol: string) => symbol.toUpperCase().startsWith('XAU')

/** Deep-link to the journal composer, pre-filled from a signal (#1). A closed
 *  signal carries its outcome so the entry opens as a win/loss template. */
function journalHrefFor(idea: TradeIdea) {
  const params = new URLSearchParams({ symbol: idea.symbol, direction: idea.direction })
  const outcome = signalOutcome(idea)
  if (outcome === 'win') params.set('compose', 'win')
  else if (outcome === 'loss') params.set('compose', 'loss')
  else params.set('compose', 'blank')
  return `/journal?${params.toString()}`
}

const PAGE_SIZE = 5

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

type CloseStatus = 'tp_hit' | 'sl_hit' | 'breakeven' | 'closed' | 'cancelled' | 'pending' | 'running'

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
  const [statusOpen, setStatusOpen] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [zoneAlert, setZoneAlert] = useState(!!idea.zoneAlert)
  const [alertBusy, setAlertBusy] = useState(false)

  // We can price metals + BTC/ETH; anything else (forex) has no live feed, and
  // the card says so instead of just quietly omitting the status.
  const priceable = isPriceable(idea.symbol)
  const live = liveSignalStatus(idea, priceable ? price : null)
  const pips = signalPips(idea)

  // Derive each TP's pip distance from entry rather than trusting the stored
  // `tp.pips` — that field can hold stale/garbage values (e.g. a raw price)
  // from older signals or hand-edits, which would render as nonsense.
  const entryPipRef = mid(idea.entryLow, idea.entryHigh)
  const tpPips = (price: number): number | null => {
    if (entryPipRef == null || !Number.isFinite(price)) return null
    return Math.round(Math.abs(price - entryPipRef) / pipConfig(idea.symbol).pipSize)
  }

  // "Open" = not yet closed. Pending (waiting for entry) and running (entry hit) both count.
  const isOpen = idea.status === 'pending' || idea.status === 'running'
  // Partial progress: TPs already hit while the signal is still running.
  const hitCount = idea.takeProfits.filter(t => t.hit).length
  const tpTotal = idea.takeProfits.length
  const inProfit = isOpen && hitCount > 0
  // Show the RUNNING label when the coach marked entry hit, or once a TP is hit.
  const isRunning = idea.status === 'running' || inProfit
  // What closing this as TP hit would book, given the TPs ticked so far.
  const tpCloseOutcome = signalOutcome({ ...idea, status: 'tp_hit' })
  const unit = pipUnit(idea.symbol)
  const tp1Pips = idea.takeProfits[0] ? tpPips(idea.takeProfits[0].price) : null

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

  const hasZone = idea.entryLow != null || idea.entryHigh != null

  async function toggleZoneAlert() {
    const next = !zoneAlert
    setZoneAlert(next) // optimistic
    setAlertBusy(true)
    try {
      const res = next
        ? await fetch('/api/alerts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideaId: idea.id }),
          })
        : await fetch('/api/alerts', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideaId: idea.id }),
          })
      if (!res.ok) setZoneAlert(!next)
    } catch {
      setZoneAlert(!next)
    } finally {
      setAlertBusy(false)
    }
  }

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
          <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-blue-400 animate-pulse' : 'bg-ink3'}`} />
          <span className="text-sm font-bold text-blue-400 shrink-0">
            {isOpen ? (isRunning ? 'RUNNING' : 'LIVE') : idea.status === 'cancelled' ? 'Cancelled' : 'Closed'}
          </span>
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
          ) : idea.status === 'running' ? (
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 border text-blue-400 bg-blue-400/10 border-blue-400/20">
              🔵 Running · entry hit
            </span>
          ) : live ? (
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${TONE[live.tone]}`}>
              {live.dot} {live.label}
            </span>
          ) : !priceable ? (
            <span className="text-xs text-ink3 bg-sunken rounded px-2 py-0.5" title={`No live price feed for ${idea.symbol} yet — status can't be tracked automatically.`}>
              No live price
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
              {fmtNum(tp.price)}{(() => { const p = tpPips(tp.price); return p != null ? <span className="text-ink3"> / {p} pips</span> : null })()}
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

      {/* the setup itself — tap to zoom, since the levels are the whole point */}
      {idea.chartUrl && (
        <>
          <button
            onClick={() => setChartOpen(true)}
            className="mt-3 block w-full rounded-lg overflow-hidden border border-line bg-sunken cursor-zoom-in"
          >
            <Image
              src={idea.chartUrl}
              alt={`${idea.symbol} chart`}
              width={1200}
              height={675}
              className="w-full max-h-72 object-contain"
              unoptimized
            />
          </button>
          {chartOpen && (
            <ImageLightbox images={[idea.chartUrl]} startIndex={0} onClose={() => setChartOpen(false)} />
          )}
        </>
      )}

      {/* community sentiment (open signals) */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-line">
          {/* Labels stay on one line and the row wraps as a whole, so the
              buttons keep a single shared height on narrow phones. */}
          <div className="flex flex-wrap items-stretch gap-2">
            <button onClick={() => vote('take')}
              className={`flex items-center justify-center gap-1.5 min-h-9 whitespace-nowrap text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors ${votes.mine === 'take' ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-ink2 border-line hover:bg-elevated'}`}>
              <ThumbsUp className="w-3.5 h-3.5 shrink-0" /> Taking {votes.take > 0 && votes.take}
            </button>
            <button onClick={() => vote('skip')}
              className={`flex items-center justify-center gap-1.5 min-h-9 whitespace-nowrap text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors ${votes.mine === 'skip' ? 'text-red-400 bg-red-400/10 border-red-400/30' : 'text-ink2 border-line hover:bg-elevated'}`}>
              <ThumbsDown className="w-3.5 h-3.5 shrink-0" /> Skipping {votes.skip > 0 && votes.skip}
            </button>
            {/* Watch the coach's own zone rather than making the member pick a
                number out of the signal and set a price alert for it. */}
            {priceable && hasZone && (
              <button onClick={toggleZoneAlert} disabled={alertBusy} title={zoneAlert ? 'Stop watching this zone' : 'Get a push when price enters the entry zone'}
                className={`flex items-center justify-center gap-1.5 min-h-9 whitespace-nowrap text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors disabled:opacity-50 ${zoneAlert ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-ink2 border-line hover:bg-elevated'}`}>
                <Bell className="w-3.5 h-3.5 shrink-0" /> {zoneAlert ? 'Watching' : 'Alert me'}
              </button>
            )}
          </div>
          {/* Tally sits beside the bar instead of squeezing into the button row,
              where it wrapped to three lines and pushed the buttons around. */}
          {totalVotes > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden flex">
                <div className="bg-green-500" style={{ width: `${takePct}%` }} />
                <div className="bg-red-500/70" style={{ width: `${100 - takePct}%` }} />
              </div>
              <span className="text-[11px] text-ink3 whitespace-nowrap">{takePct}% taking · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* close-outcome menu (staff, running signals) */}
      {canManage && isOpen && closing && (
        <div className="mt-3 rounded-lg border border-line bg-sunken p-2">
          <p className="text-[11px] font-bold text-ink3 uppercase tracking-wider mb-2 px-1">Close signal as…</p>
          <div className="flex items-stretch gap-2">
            <button onClick={() => { onClose(idea, 'tp_hit'); setClosing(false) }}
              className="flex-1 min-w-0 min-h-10 text-xs font-bold rounded-lg px-1 py-2 text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-colors">✅ TP hit</button>
            <button onClick={() => { onClose(idea, 'sl_hit'); setClosing(false) }}
              className="flex-1 min-w-0 min-h-10 text-xs font-bold rounded-lg px-1 py-2 text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors">🔴 Loss (SL)</button>
            <button onClick={() => { onClose(idea, 'breakeven'); setClosing(false) }}
              className="flex-1 min-w-0 min-h-10 text-xs font-bold rounded-lg px-1 py-2 text-ink2 bg-elevated border border-line hover:bg-line/40 transition-colors">⚪ Breakeven</button>
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
          {/* Whether a TP close lands as a win is read off the ticked TPs, so spell
              out what this one will do — here, where the coach is about to close. */}
          <p className="mt-2 px-1 text-[10px] text-ink3 leading-snug">
            {tpCloseOutcome === 'loss' ? (
              <>
                Only TP1 is ticked and it sits <span className="font-semibold text-ink2">{tp1Pips} {unit}</span> from entry,
                so <span className="font-semibold text-ink2">TP hit</span> books this as a{' '}
                <span className="font-semibold text-red-400">loss</span> — TP1 alone needs more than {TP1_WIN_MIN_PIPS} {unit}.
              </>
            ) : hitCount === 0 && tpTotal > 1 ? (
              <>Tick the targets that actually hit in <span className="font-semibold text-ink2">Edit</span> first — TP2 is a win, TP1 alone only counts above {TP1_WIN_MIN_PIPS} {unit}.</>
            ) : (
              <><span className="font-semibold text-ink2">TP hit</span> books this as a <span className="font-semibold text-green-400">win</span>.</>
            )}
          </p>
          <button onClick={() => setClosing(false)} className="mt-2 w-full text-[11px] text-ink3 hover:text-ink2 py-1">Cancel</button>
        </div>
      )}

      {/* quick status toggle (staff, open signals) — flip pending ⇄ running without the full editor */}
      {canManage && isOpen && statusOpen && (
        <div className="mt-3 rounded-lg border border-line bg-sunken p-2">
          <p className="text-[11px] font-bold text-ink3 uppercase tracking-wider mb-2 px-1">Trade status</p>
          <div className="flex items-stretch gap-2">
            <button onClick={() => { onClose(idea, 'pending'); setStatusOpen(false) }}
              className={`flex-1 rounded-lg py-2 px-1 border transition-colors ${idea.status === 'pending' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-ink2 bg-elevated border-line hover:bg-line/40'}`}>
              <span className="block text-xs font-bold">⏳ Pending</span>
              <span className="block text-[10px] text-ink3 mt-0.5">Waiting for entry</span>
            </button>
            <button onClick={() => { onClose(idea, 'running'); setStatusOpen(false) }}
              className={`flex-1 rounded-lg py-2 px-1 border transition-colors ${idea.status === 'running' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' : 'text-ink2 bg-elevated border-line hover:bg-line/40'}`}>
              <span className="block text-xs font-bold">🔵 Running</span>
              <span className="block text-[10px] text-ink3 mt-0.5">Entry hit</span>
            </button>
          </div>
          <button onClick={() => setStatusOpen(false)} className="mt-2 w-full text-[11px] text-ink3 hover:text-ink2 py-1">Cancel</button>
        </div>
      )}

      {/* actions (staff manage controls; members use the per-level copy buttons above) */}
      {canManage && (
        <div className="mt-3 flex items-stretch gap-2">
          {isOpen ? (
            <button onClick={() => { setClosing(v => !v); setStatusOpen(false) }} title="Close signal"
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 min-h-10 px-2.5 py-2 rounded-lg text-xs font-bold text-ink2 border border-line hover:text-red-400 hover:border-red-400/40 hover:bg-elevated transition-colors">
              <XCircle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Close signal</span>
            </button>
          ) : (
            <button onClick={() => onClose(idea, 'pending')} title="Mark this signal as live again"
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 min-h-10 px-2.5 py-2 rounded-lg text-xs font-bold text-ink2 border border-line hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Mark as Live</span>
            </button>
          )}
          {isOpen && (
            <button onClick={() => { setStatusOpen(v => !v); setClosing(false) }} title="Update trade status (pending / running)"
              className={`flex items-center justify-center gap-1.5 min-h-10 px-2.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${idea.status === 'running' ? 'text-blue-400 border-blue-400/40 bg-blue-400/10' : 'text-ink2 border-line hover:text-blue-400 hover:border-blue-400/40 hover:bg-elevated'}`}>
              <Activity className="w-3.5 h-3.5 shrink-0" /> {idea.status === 'running' ? 'Running' : 'Status'}
            </button>
          )}
          <button onClick={() => onEdit(idea)} title="Edit signal"
            className="flex items-center justify-center gap-1.5 min-h-10 px-2.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap text-ink2 border border-line hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
            <Pencil className="w-3.5 h-3.5 shrink-0" /> Edit
          </button>
          <button onClick={() => onDelete(idea)} title="Delete signal" aria-label="Delete signal" className="flex items-center justify-center min-h-10 w-10 shrink-0 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}

      {/* Catch the trade at the moment it matters: log it while it's fresh (#1).
          Closed signals prompt more strongly, since the outcome is known. */}
      {idea.status !== 'cancelled' && (
        <Link
          href={journalHrefFor(idea)}
          className={`mt-3 flex items-center justify-center gap-1.5 w-full min-h-10 px-3 py-2 rounded-lg text-xs font-bold text-center border transition-colors ${
            isOpen
              ? 'text-ink2 border-line hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated'
              : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10'
          }`}
        >
          <NotebookPen className="w-3.5 h-3.5" /> {isOpen ? 'Log to your journal' : 'Log this trade to your journal'}
        </Link>
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

/* ---------- editor modal ---------- */
/** A room a signal can be mirrored into — Telegram, Discord, or Telegram via IFTTT. */
interface RelayRoom { id: string; channel: 'telegram' | 'discord' | 'ifttt'; label: string }

const ROOM_STYLE = {
  telegram: { Icon: Send, tint: 'text-sky-400', tag: 'telegram' },
  discord: { Icon: MessageCircle, tint: 'text-indigo-400', tag: 'discord' },
  ifttt: { Icon: Send, tint: 'text-orange-400', tag: 'telegram · ifttt' },
} as const

const EMPTY = {
  symbol: 'XAUUSD', direction: 'buy' as 'buy' | 'sell', entryLow: '', entryHigh: '',
  slLow: '', slHigh: '', currentPrice: '', status: 'pending' as TradeIdea['status'],
  notes: '', chartUrl: '', isPublic: true,
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
      chartUrl: initial.chartUrl ?? '',
      isPublic: initial.isPublic,
      takeProfits: initial.takeProfits.length
        ? initial.takeProfits.map(t => ({ price: t.price?.toString() ?? '', pips: t.pips?.toString() ?? '', hit: !!t.hit }))
        : [{ price: '', pips: '', hit: false }],
    }
  })
  const [saving, setSaving] = useState(false)
  const [paste, setPaste] = useState('')
  // Whether the current paste text has been run through Parse & fill. Reset on
  // every keystroke so we can catch a coach who typed a signal but never parsed it.
  const [pasteApplied, setPasteApplied] = useState(false)
  // Inline result of the last Parse & fill attempt (error = unreadable, ok = summary).
  const [pasteInfo, setPasteInfo] = useState<{ type: 'error' | 'ok'; msg: string } | null>(null)
  // Blocking validation errors shown above the Post button.
  const [errors, setErrors] = useState<string[]>([])

  // Parse a pasted shorthand signal and fill the form.
  function applyPaste() {
    if (!paste.trim()) {
      setPasteInfo({ type: 'error', msg: 'Type or paste a signal above first.' })
      return
    }
    const p = parseSignal(paste)
    // Nothing usable came out — warn instead of silently doing nothing.
    if (p.entryLow == null && p.slLow == null && p.takeProfits.length === 0 && !p.symbol && !p.direction) {
      setPasteInfo({
        type: 'error',
        msg: "Couldn't read a signal from that text. Check the format — e.g. “Buy 4110-4105 / TP 4115 4120 / SL 4088”.",
      })
      return
    }
    setF(s => {
      // Anchor pips to the parsed entry (mid of the range) so each TP shows its
      // distance from entry. Falls back to the existing entry / blank if unknown.
      const symbol = p.symbol ?? s.symbol
      const entryRef = mid(
        p.entryLow ?? (s.entryLow ? Number(s.entryLow) : null),
        p.entryHigh ?? (s.entryHigh ? Number(s.entryHigh) : null),
      )
      const { pipSize } = pipConfig(symbol)
      const pipsFor = (price: number) =>
        entryRef != null && Number.isFinite(price)
          ? String(Math.round(Math.abs(price - entryRef) / pipSize))
          : ''
      return {
      ...s,
      symbol,
      direction: p.direction ?? s.direction,
      entryLow: p.entryLow != null ? String(p.entryLow) : s.entryLow,
      entryHigh: p.entryHigh != null && p.entryHigh !== p.entryLow ? String(p.entryHigh) : '',
      slLow: p.slLow != null ? String(p.slLow) : s.slLow,
      slHigh: p.slHigh != null && p.slHigh !== p.slLow ? String(p.slHigh) : '',
      takeProfits: p.takeProfits.length
        ? p.takeProfits.map(n => ({ price: String(n), pips: pipsFor(n), hit: false }))
        : s.takeProfits,
      notes: p.moreEntries.length
        ? `${s.notes ? s.notes + '\n' : ''}Add more: ${p.moreEntries.join(', ')}`
        : s.notes,
      }
    })
    // Summarise what was filled so the coach can confirm at a glance.
    const parts: string[] = []
    if (p.symbol) parts.push(p.symbol)
    if (p.direction) parts.push(p.direction.toUpperCase())
    if (p.entryLow != null) parts.push('entry')
    if (p.takeProfits.length) parts.push(`${p.takeProfits.length} TP${p.takeProfits.length > 1 ? 's' : ''}`)
    if (p.slLow != null) parts.push('SL')
    setPasteApplied(true)
    setErrors([])
    setPasteInfo({ type: 'ok', msg: `Filled: ${parts.join(' · ')}. Review the fields below, then post.` })
  }

  // Check the form before saving. Returns human-readable problems ([] = all good).
  function validate(): string[] {
    const errs: string[] = []
    if (!f.symbol.trim()) errs.push('Enter a symbol (e.g. XAUUSD).')

    // The classic mistake: text left in Quick paste that was never parsed.
    if (paste.trim() && !pasteApplied) {
      errs.push("You've typed a signal in Quick paste but haven't filled the form — tap “Parse & fill ↓”, or clear the box.")
    }

    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    const eLow = num(f.entryLow), eHigh = num(f.entryHigh)
    const slLow = num(f.slLow), slHigh = num(f.slHigh)
    const tpNums = f.takeProfits.map(t => num(t.price)).filter((n): n is number => n != null && Number.isFinite(n))

    // A signal with no entry, no target and no stop is empty — almost always the
    // "forgot to parse" case. Block it with a clear message.
    if (eLow == null && eHigh == null) errs.push('Add an entry price.')
    if (tpNums.length === 0 && slLow == null && slHigh == null) {
      errs.push('Add at least one take-profit or a stop loss.')
    }

    // Reject non-positive / non-numeric prices.
    const bad = [eLow, eHigh, slLow, slHigh, ...tpNums].filter(v => v != null && (!Number.isFinite(v) || v <= 0))
    if (bad.length) errs.push('Prices must be numbers greater than zero.')

    // Directional sanity: for a buy, targets sit above entry and the stop below (reversed for a sell).
    const entryMid = eLow != null && eHigh != null ? (eLow + eHigh) / 2 : (eLow ?? eHigh)
    const slMid = slLow != null && slHigh != null ? (slLow + slHigh) / 2 : (slLow ?? slHigh)
    if (entryMid != null && Number.isFinite(entryMid)) {
      if (f.direction === 'buy') {
        tpNums.forEach((tp, i) => { if (tp <= entryMid) errs.push(`TP${i + 1} (${tp}) is at or below your BUY entry — targets go above entry.`) })
        if (slMid != null && slMid >= entryMid) errs.push('Stop loss is at or above your BUY entry — the stop goes below entry.')
      } else {
        tpNums.forEach((tp, i) => { if (tp >= entryMid) errs.push(`TP${i + 1} (${tp}) is at or above your SELL entry — targets go below entry.`) })
        if (slMid != null && slMid <= entryMid) errs.push('Stop loss is at or below your SELL entry — the stop goes above entry.')
      }
    }
    return errs
  }

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setErrors([]); setF(s => ({ ...s, [k]: v })) }
  function setTp(i: number, patch: Partial<{ price: string; pips: string; hit: boolean }>) {
    setErrors([])
    setF(s => {
      const takeProfits = s.takeProfits.map((t, idx) => idx === i ? { ...t, ...patch } : t)
      // Ticking a TP means entry was hit and the trade is now running — flag it running
      // (unless it's already been closed to a final outcome, which the coach set on purpose).
      const status = patch.hit && s.status === 'pending' ? 'running' : s.status
      return { ...s, takeProfits, status }
    })
  }

  async function save() {
    // Stop obviously-broken signals (empty form, unparsed paste, wrong-side stop…) before they post.
    const errs = validate()
    if (errs.length) {
      setErrors(errs)
      return
    }
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
      if (res.ok) {
        onSaved(await res.json(), !initial)
      } else {
        // Surface the server's reason (e.g. validation guard) instead of failing silently.
        const data = await res.json().catch(() => null)
        setErrors([data?.error || 'Something went wrong saving this signal. Please try again.'])
      }
    } catch {
      setErrors(['Network error — check your connection and try again.'])
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
              onChange={e => { setPaste(e.target.value); setPasteApplied(false); setPasteInfo(null) }}
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
            {pasteInfo && (
              <div className={`mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${pasteInfo.type === 'error' ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-green-400 bg-green-400/10 border border-green-400/20'}`}>
                {pasteInfo.type === 'error'
                  ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  : <Check className="w-3.5 h-3.5 shrink-0 mt-px" />}
                <span>{pasteInfo.msg}</span>
              </div>
            )}
            {/* Reminder: coach typed a signal but hasn't parsed it yet. */}
            {paste.trim() && !pasteApplied && !pasteInfo && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug text-yellow-500 bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>Don&rsquo;t forget to tap <b>Parse &amp; fill</b> — otherwise this text won&rsquo;t be added to the signal.</span>
              </div>
            )}
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
                <option value="pending">Pending (waiting for entry)</option>
                <option value="running">Running (entry hit)</option>
                <option value="tp_hit">TP Hit</option>
                <option value="sl_hit">SL Hit</option>
                <option value="breakeven">Breakeven</option>
                <option value="closed">Closed manually</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <textarea value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes / rationale (optional)" rows={2} className={`${inputCls} resize-none`} />

          {/* the marked-up chart behind the numbers */}
          <ChartUpload value={f.chartUrl || null} onChange={url => set('chartUrl', url ?? '')} label="Add chart screenshot (optional)" />

          {/* visibility */}
          <div className="flex items-center gap-2">
            <button onClick={() => set('isPublic', false)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${!f.isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Lock className="w-3.5 h-3.5" /> Private</button>
            <button onClick={() => set('isPublic', true)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${f.isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Globe className="w-3.5 h-3.5" /> Public</button>
          </div>

        </div>

        <div className="sticky bottom-0 bg-surface border-t border-line">
          {errors.length > 0 && (
            <div className="mx-4 mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-bold text-red-400">
                  {errors.length === 1 ? 'Please fix this before posting:' : `Please fix ${errors.length} issues before posting:`}
                </span>
              </div>
              <ul className="space-y-1 pl-5 list-disc marker:text-red-400/60">
                {errors.map((e, i) => <li key={i} className="text-[11px] text-ink2 leading-snug">{e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2 p-4">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">{initial ? 'Save' : 'Post Idea'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- trade message composer ---------- */
/**
 * Broadcasts a trade message to the Telegram/Discord rooms, and only files it
 * as a signal on the app if the coach ticks the box.
 *
 * Separate from New Signal on purpose: most of what goes to the rooms is an
 * update — "close half here", "moved to breakeven" — that shouldn't spawn a
 * card on /ideas. The preview below the box is rendered by the same formatter
 * the server sends with, so what a coach approves is what the rooms get.
 */
function TradeMessageComposer({ onClose, onPosted }: {
  onClose: () => void
  onPosted: (idea: TradeIdea | null) => void
}) {
  const [text, setText] = useState('')
  const [rooms, setRooms] = useState<RelayRoom[]>([])
  const [to, setTo] = useState<string[]>([])
  const [postToApp, setPostToApp] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/staff/relay')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setRooms(d.destinations ?? []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // What the rooms will actually receive. Parsed on every keystroke so a coach
  // sees the reformatting — and any misread price — before sending, not after.
  const parsed = useMemo(() => (text.trim() ? parseSignal(text) : null), [text])
  const preview = useMemo(() => {
    if (!parsed) return null
    return formatSignalText(
      {
        symbol: parsed.symbol ?? 'Signal',
        direction: parsed.direction ?? 'buy',
        entryLow: parsed.entryLow,
        entryHigh: parsed.entryHigh,
        slLow: parsed.slLow,
        slHigh: parsed.slHigh,
        takeProfits: parsed.takeProfits.map(price => ({ price })),
        notes: parsed.moreEntries.length ? `Add more: ${parsed.moreEntries.join(', ')}` : null,
      },
      { url: typeof window === 'undefined' ? undefined : `${window.location.origin}/ideas` },
    )
  }, [parsed])

  // Only blocks the half that stores data — a room message needs neither.
  const appBlockers = !parsed
    ? ['Type a message first.']
    : [
        !parsed.symbol && 'No symbol found (e.g. XAUUSD).',
        parsed.entryLow == null && parsed.entryHigh == null && 'No entry price found.',
      ].filter((v): v is string => Boolean(v))

  const canSend = text.trim() !== '' && (to.length > 0 || postToApp) && !(postToApp && appBlockers.length > 0)

  async function send() {
    setSending(true); setMsg(null)
    try {
      const res = await fetch('/api/signals/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, to, postToApp, isPublic }),
      })
      const d = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: d.error || 'Could not send that.' })
        return
      }
      const sent = d.relay?.sent ?? 0
      const failed: string[] = d.relay?.failures ?? []
      setMsg({
        type: failed.length ? 'error' : 'ok',
        text: [
          to.length ? `Sent to ${sent}/${to.length} room${to.length === 1 ? '' : 's'}.` : 'Not sent to any room.',
          d.idea ? 'Posted as a signal on the app.' : null,
          failed.length ? `Failed: ${failed.join(', ')}.` : null,
        ].filter(Boolean).join(' '),
      })
      onPosted(d.idea ?? null)
      if (!failed.length) setText('')
    } catch {
      setMsg({ type: 'error', text: 'Network error — check your connection and try again.' })
    } finally {
      setSending(false)
    }
  }

  const inputCls = 'bg-sunken border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-line2 w-full'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-line max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface flex items-center justify-between p-4 border-b border-line z-10">
          <h2 className="font-bold text-ink flex items-center gap-1.5"><Send className="w-4 h-4 text-yellow-500" /> New Trade Message</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Message</label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setMsg(null) }}
              rows={7}
              placeholder={"Sell now 4259-4254-4250\n4245\n4240\n4230\nSl 4267"}
              className={`${inputCls} mt-1.5 resize-none font-mono text-xs`}
            />
          </div>

          {preview && (
            <div>
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">What the rooms receive</label>
              <pre className="mt-1.5 rounded-lg border border-line bg-sunken p-3 text-[11px] leading-relaxed text-ink2 whitespace-pre-wrap font-mono">{preview}</pre>
            </div>
          )}

          {/* rooms */}
          <div className="rounded-lg border border-line bg-sunken/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-yellow-500" /> Send to
              </label>
              {rooms.length > 1 && (
                <button
                  onClick={() => setTo(to.length === rooms.length ? [] : rooms.map(r => r.id))}
                  className="text-[10px] font-semibold text-yellow-500 hover:text-yellow-400"
                >
                  {to.length === rooms.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            {rooms.length === 0 ? (
              <p className="text-[11px] text-ink3 leading-snug mt-1.5">
                No rooms connected yet. An admin adds them with the{' '}
                <code className="text-ink2">TELEGRAM_CHATS</code>,{' '}
                <code className="text-ink2">DISCORD_WEBHOOKS</code> or{' '}
                <code className="text-ink2">IFTTT_WEBHOOKS</code> environment variables — see{' '}
                <code className="text-ink2">docs/signal-relay.md</code>.
              </p>
            ) : (
              <div className="space-y-1 mt-1.5">
                {rooms.map(r => {
                  const on = to.includes(r.id)
                  const { Icon, tint, tag } = ROOM_STYLE[r.channel]
                  return (
                    <button
                      key={r.id}
                      onClick={() => setTo(s => (s.includes(r.id) ? s.filter(x => x !== r.id) : [...s, r.id]))}
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${on ? 'bg-yellow-500/10 border border-yellow-500/40 text-ink' : 'bg-sunken border border-line text-ink3 hover:text-ink2'}`}
                    >
                      {on ? <CheckSquare className="w-4 h-4 shrink-0 text-yellow-500" /> : <Square className="w-4 h-4 shrink-0" />}
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${tint}`} />
                      <span className="font-semibold truncate">{r.label}</span>
                      <span className="ml-auto text-[10px] text-ink3 shrink-0 flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5" />{tag}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(preview ?? text)
                  setMsg({ type: 'ok', text: 'Copied — paste it into the group.' })
                } catch {
                  setMsg({ type: 'error', text: 'Could not reach the clipboard — select the text manually.' })
                }
              }}
              disabled={!text.trim()}
              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-line bg-sunken py-2 text-xs font-semibold text-ink2 hover:text-ink transition-colors disabled:opacity-40"
            >
              <Copy className="w-3.5 h-3.5" /> Copy for Telegram
            </button>
          </div>

          {/* also post as a signal on the app */}
          <div className="rounded-lg border border-line bg-sunken/50 p-3">
            <button
              onClick={() => { setPostToApp(!postToApp); setMsg(null) }}
              className="w-full flex items-center gap-2 text-left"
            >
              {postToApp ? <CheckSquare className="w-4 h-4 shrink-0 text-yellow-500" /> : <Square className="w-4 h-4 shrink-0 text-ink3" />}
              <span className={`text-sm font-semibold ${postToApp ? 'text-ink' : 'text-ink3'}`}>Also post as a signal on the app</span>
            </button>
            <p className="text-[11px] text-ink3 leading-snug mt-1.5">
              Creates a tracked card on /ideas with entry, targets and stop — and alerts members by push and email.
              Leave it off for updates like &ldquo;close half here&rdquo;.
            </p>

            {postToApp && (
              appBlockers.length > 0 ? (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-[11px] text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{appBlockers.join(' ')} Add it to the message above, or untick this.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setIsPublic(false)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${!isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Lock className="w-3 h-3" /> Private</button>
                  <button onClick={() => setIsPublic(true)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${isPublic ? 'bg-sunken border border-yellow-500/40 text-yellow-500' : 'bg-sunken border border-line text-ink3'}`}><Globe className="w-3 h-3" /> Public</button>
                </div>
              )
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-line">
          {msg && (
            <div className={`mx-4 mt-3 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${msg.type === 'error' ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-green-400 bg-green-400/10 border border-green-400/20'}`}>
              {msg.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> : <Check className="w-3.5 h-3.5 shrink-0 mt-px" />}
              <span>{msg.text}</span>
            </div>
          )}
          <div className="flex gap-2 p-4">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Close</Button>
            <Button variant="gold" size="sm" onClick={send} loading={sending} disabled={!canSend} className="flex-1">
              {postToApp ? 'Send & post' : 'Send'}
            </Button>
          </div>
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
            <h3 className="font-bold text-ink mb-1">Marking a signal Running (entry hit)</h3>
            <p className="text-ink3 leading-relaxed">
              When price trades into your entry, tap the <span className="font-semibold text-blue-400">Status</span> button
              (between <span className="font-semibold text-ink2">Close signal</span> and <span className="font-semibold text-ink2">Edit</span>)
              and pick <span className="font-semibold text-blue-400">🔵 Running · entry hit</span> — one tap, no need to open the editor.
              The card then shows a <span className="font-semibold text-blue-400">RUNNING</span> badge so members know the trade is live
              in the market, not just waiting. Ticking any take-profit sets Running for you automatically, and you can flip it back
              to <span className="font-semibold text-ink2">Pending</span> the same way. It stays a neutral, open state — it never
              touches win-rate until you close the signal.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-ink mb-1">Status &amp; closing (all manual)</h3>
            <p className="text-ink3 leading-relaxed mb-2">
              Nothing auto-closes anymore — <span className="font-semibold text-ink2">you</span> set the outcome. Tap
              <span className="font-semibold text-ink2"> Close signal</span> and pick one:
            </p>
            <ul className="space-y-1.5 text-ink3">
              <li><span className="text-green-400 font-semibold">✅ TP hit</span> — targets hit. <span className="text-ink2">A win at TP2, or at TP1 alone if it ran more than {TP1_WIN_MIN_PIPS} pips.</span></li>
              <li><span className="text-red-400 font-semibold">🔴 Loss (SL)</span> — stop hit. <span className="text-ink2">Counts as a loss.</span></li>
              <li><span className="text-ink2 font-semibold">⚪ Breakeven</span> — closed at entry, no gain/loss. <span className="text-ink2">Neutral.</span></li>
              <li><span className="text-ink2 font-semibold">⚫ Closed manually</span> — you <span className="text-ink2 font-semibold">entered</span> then closed by hand before TP/SL. <span className="text-ink2">Neutral.</span></li>
              <li><span className="text-ink3 font-semibold">🚫 Cancelled</span> — trade <span className="text-ink2 font-semibold">never triggered</span> (didn&rsquo;t reach entry / called off). <span className="text-ink2">Neutral.</span></li>
            </ul>
            <p className="text-[12px] text-ink3 leading-relaxed mt-2 rounded-lg bg-sunken border border-line px-3 py-2">
              <span className="font-bold text-ink2">Only TP hit and Loss (SL) affect win-rate.</span> Breakeven,
              Closed manually, and Cancelled are neutral — they never move your stats. Rule of thumb: <span className="italic">did we
              actually enter?</span> Yes → Closed manually · No → Cancelled.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-ink mb-1">When a TP close counts as a win</h3>
            <p className="text-ink3 leading-relaxed">
              Reaching <span className="font-semibold text-ink2">TP2</span> is a win, always. A signal that stalls at
              <span className="font-semibold text-ink2"> TP1</span> only counts if TP1 was a real move — more than
              <span className="font-semibold text-ink2"> {TP1_WIN_MIN_PIPS} pips</span> from entry. Under that, closing it books a
              <span className="font-semibold text-red-400"> loss</span>, and the card, the filters, Results and the weekly recap
              all read it that way.
            </p>
            <ul className="space-y-1.5 text-ink3 mt-2">
              <li>Which targets were reached comes from the <span className="font-semibold text-ink2">ticks</span> beside each TP — tick them in <span className="font-semibold text-ink2">Edit</span> (or on the card) as they hit, then close the signal.</li>
              <li>TP2 or deeper ticked → <span className="text-green-400 font-semibold">win</span>.</li>
              <li>Only TP1 ticked → <span className="text-green-400 font-semibold">win</span> above {TP1_WIN_MIN_PIPS} pips from entry, <span className="text-red-400 font-semibold">loss</span> at or below it. The close menu tells you which before you tap.</li>
              <li>On crypto and indices the same threshold is read in <span className="font-semibold text-ink2">points</span>, since those don&rsquo;t trade in pips.</li>
              <li>Closing as TP hit with <span className="font-semibold text-ink2">no</span> TP ticked is taken at your word and counts as a win, so tick the targets to keep the stats honest.</li>
            </ul>
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
              <li>Closing a signal that counts as a <span className="font-semibold text-ink2">win</span> sends a push to the whole community — so update outcomes promptly.</li>
              <li>Stats, the coach leaderboard, and the Monday weekly recap are all computed automatically from your closed signals.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- labeled filter pill row ---------- */
function FilterRow<T extends string>({ label, value, onChange, options, color }: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, string])[]
  color?: Partial<Record<T, string>> // active classes per option (defaults to gold)
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-12 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink3">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => {
          const active = value === v
          const activeCls = color?.[v] ?? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
          return (
            <button key={v} onClick={() => onChange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? activeCls : 'text-ink3 border-transparent hover:bg-elevated'}`}>
              {l}
            </button>
          )
        })}
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
  const [messenger, setMessenger] = useState(false)
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [acct, setAcct] = useState<Acct | null>(null)
  const [showAcct, setShowAcct] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [page, setPage] = useState(1)
  const [dirFilter, setDirFilter] = useState<DirFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [metalFilter, setMetalFilter] = useState<MetalFilter>('all')
  const [coachFilter, setCoachFilter] = useState<string>('all') // author id, or 'all'
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  // Every distinct instrument on the board that we can actually price. Joined to
  // a string so the poll effect re-runs when the set changes, not on every load.
  const symbolKey = useMemo(
    () => [...new Set(ideas.map(i => normalizeSymbol(i.symbol)).filter(isPriceable))].sort().join(','),
    [ideas],
  )

  // Live prices for the "still enterable?" status — polled every 2s so they tick
  // near-live, paused when the tab is hidden to save requests/battery. One batched
  // request covers every symbol on the board.
  useEffect(() => {
    if (!symbolKey) return
    const poll = () => {
      if (document.hidden) return
      fetch(`/api/price?symbols=${symbolKey}`)
        .then(r => r.json())
        .then(d => { if (d?.prices) setPrices(d.prices) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
    document.addEventListener('visibilitychange', poll) // refresh immediately when tab refocuses
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', poll) }
  }, [symbolKey])

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

  // Distinct coaches present in the current list, for the coach dropdown.
  const coaches = Array.from(
    new Map(ideas.map(i => [i.author.id, i.author.name || 'Coach'])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  // Live = still open; Win/Loss map to the outcomes that move win-rate.
  const filteredIdeas = ideas.filter(i => {
    if (dirFilter !== 'all' && i.direction !== dirFilter) return false
    if (coachFilter !== 'all' && i.author.id !== coachFilter) return false
    if (metalFilter === 'gold' && !isGoldSymbol(i.symbol)) return false
    if (metalFilter === 'other' && isGoldSymbol(i.symbol)) return false
    if (statusFilter === 'live') return i.status === 'pending' || i.status === 'running'
    if (statusFilter === 'win') return signalOutcome(i) === 'win'
    if (statusFilter === 'loss') return signalOutcome(i) === 'loss'
    return true
  })

  const activeFilterCount = [statusFilter, metalFilter, dirFilter, coachFilter].filter(f => f !== 'all').length
  const anyFilterActive = activeFilterCount > 0
  const clearFilters = () => { setStatusFilter('all'); setMetalFilter('all'); setDirFilter('all'); setCoachFilter('all') }

  // Reset to the first page when switching tabs or changing a filter.
  useEffect(() => { setPage(1) }, [tab, dirFilter, statusFilter, metalFilter, coachFilter])

  // The selected coach may vanish when the list reloads (e.g. tab switch) — fall back to All.
  useEffect(() => {
    if (coachFilter !== 'all' && !ideas.some(i => i.author.id === coachFilter)) setCoachFilter('all')
  }, [ideas, coachFilter])

  const pageCount = Math.max(1, Math.ceil(filteredIdeas.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const pagedIdeas = filteredIdeas.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

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
      {/* Above the signals on purpose: the moment that matters is right before
          the next trade, not buried in the journal after the damage is done. */}
      <RiskGuard />

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
            <button onClick={() => setMessenger(true)} title="Send a message to the Telegram/Discord rooms"
              className="flex items-center gap-1.5 text-xs font-bold text-ink2 border border-line rounded-lg px-3 py-1.5 hover:text-yellow-500 hover:border-yellow-500/40 hover:bg-elevated transition-colors">
              <Send className="w-3.5 h-3.5" /> Message
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

      {/* filters — collapsible; result / market / side / coach, each clearly labeled */}
      {tab !== 'stats' && !loading && ideas.length > 0 && (
        <div className="rounded-xl border border-line bg-surface">
          <div className="w-full flex items-center gap-2 px-3 py-2.5">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <SlidersHorizontal className="w-4 h-4 text-ink3 shrink-0" />
              <span className="text-sm font-semibold text-ink">Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold text-black bg-yellow-500 rounded-full px-1.5 py-0.5 leading-none">
                  {activeFilterCount}
                </span>
              )}
              <span className="ml-auto text-[11px] text-ink3 whitespace-nowrap">
                {anyFilterActive ? `${filteredIdeas.length} of ${ideas.length}` : ideas.length} signal{ideas.length !== 1 ? 's' : ''}
              </span>
            </button>
            {anyFilterActive && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-yellow-500 hover:text-yellow-400 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-label={filtersOpen ? 'Collapse filters' : 'Expand filters'}
              className="shrink-0"
            >
              <ChevronDown className={`w-4 h-4 text-ink3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {filtersOpen && (
            <div className="border-t border-line p-3 space-y-2.5">
              <FilterRow label="Result" value={statusFilter} onChange={setStatusFilter}
                options={[['all', 'All'], ['live', 'Live'], ['win', 'Wins'], ['loss', 'Losses']]} />
              <FilterRow label="Market" value={metalFilter} onChange={setMetalFilter}
                options={[['all', 'All'], ['gold', 'Gold'], ['other', 'Non-gold']]} />
              <FilterRow label="Side" value={dirFilter} onChange={setDirFilter}
                options={[['all', 'All'], ['buy', 'Buy'], ['sell', 'Sell']]}
                color={{ buy: 'bg-green-400/10 text-green-400 border-green-400/20', sell: 'bg-red-400/10 text-red-400 border-red-400/20' }} />
              {coaches.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink3">Coach</span>
                  <select value={coachFilter} onChange={e => setCoachFilter(e.target.value)}
                    aria-label="Filter by coach"
                    className="text-xs font-semibold rounded-lg border border-line bg-sunken text-ink2 px-2.5 py-1.5 outline-none focus:border-yellow-500/40 scheme-dark">
                    <option value="all">All coaches</option>
                    {coaches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
          {filteredIdeas.length === 0 && (
            <div className="bg-surface rounded-xl border border-line p-10 text-center">
              <Lightbulb className="w-10 h-10 text-yellow-500/30 mx-auto mb-3" />
              <p className="text-ink3 text-sm">No signals match these filters.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-yellow-500 hover:text-yellow-400"
              >
                Clear filters
              </button>
            </div>
          )}
          {pagedIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              canManage={isStaff}
              onEdit={i => setEditor({ open: true, idea: i })}
              onDelete={handleDelete}
              onClose={handleClose}
              price={prices[normalizeSymbol(idea.symbol)] ?? null}
              acct={acct}
            />
          ))}

          {ideas.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
              <p className="text-[11px] text-ink3">
                Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, ideas.length)} of {ideas.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={pageSafe <= 1}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
                >
                  Prev
                </button>
                <span className="text-[11px] text-ink3 tabular-nums px-1">{pageSafe} / {pageCount}</span>
                <button
                  onClick={() => { setPage(p => Math.min(pageCount, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={pageSafe >= pageCount}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editor.open && (
        <IdeaEditor
          initial={editor.idea}
          onClose={() => setEditor({ open: false, idea: null })}
          onSaved={handleSaved}
        />
      )}

      {messenger && (
        <TradeMessageComposer
          onClose={() => setMessenger(false)}
          // Only a message that also filed a signal has anything to add here.
          onPosted={idea => { if (idea) handleSaved(idea, true) }}
        />
      )}
    </div>
  )
}
