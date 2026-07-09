'use client'
import { useMemo } from 'react'
import { TrendingUp, Target, Scale, BarChart3 } from 'lucide-react'

export interface Entry {
  symbol: string | null
  result: string | null // win | loss | breakeven
  pnl: number | null
  tradedAt: string | null
  createdAt?: string
}

const money = (n: number) => `${n >= 0 ? '' : '-'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function JournalAnalytics({ entries }: { entries: Entry[] }) {
  const a = useMemo(() => {
    const withPnl = entries.filter(e => e.pnl != null)
    const wins = entries.filter(e => e.result === 'win').length
    const losses = entries.filter(e => e.result === 'loss').length
    const decided = wins + losses
    const winRate = decided ? Math.round((wins / decided) * 100) : null

    const gains = withPnl.filter(e => (e.pnl ?? 0) > 0).map(e => e.pnl!)
    const drops = withPnl.filter(e => (e.pnl ?? 0) < 0).map(e => e.pnl!)
    const netPnl = withPnl.reduce((s, e) => s + (e.pnl ?? 0), 0)
    const avgWin = gains.length ? gains.reduce((s, v) => s + v, 0) / gains.length : 0
    const avgLoss = drops.length ? drops.reduce((s, v) => s + v, 0) / drops.length : 0
    const grossWin = gains.reduce((s, v) => s + v, 0)
    const grossLoss = Math.abs(drops.reduce((s, v) => s + v, 0))
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0)

    // Equity curve — cumulative P&L over time.
    const sorted = [...withPnl].sort((x, y) => {
      const tx = new Date(x.tradedAt || x.createdAt || 0).getTime()
      const ty = new Date(y.tradedAt || y.createdAt || 0).getTime()
      return tx - ty
    })
    let cum = 0
    const curve = sorted.map(e => (cum += e.pnl ?? 0))

    // By pair
    const pairMap = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>()
    for (const e of entries) {
      const sym = (e.symbol || '—').toUpperCase()
      const c = pairMap.get(sym) ?? { trades: 0, wins: 0, losses: 0, pnl: 0 }
      c.trades++
      if (e.result === 'win') c.wins++
      if (e.result === 'loss') c.losses++
      c.pnl += e.pnl ?? 0
      pairMap.set(sym, c)
    }
    const pairs = [...pairMap.entries()].map(([sym, v]) => ({ sym, ...v, winRate: v.wins + v.losses ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0 }))
      .sort((x, y) => y.pnl - x.pnl).slice(0, 8)

    // By day of week (win rate)
    const dow = Array.from({ length: 7 }, () => ({ wins: 0, losses: 0 }))
    for (const e of entries) {
      if (!e.result || (e.result !== 'win' && e.result !== 'loss')) continue
      const d = new Date(e.tradedAt || e.createdAt || 0)
      if (isNaN(d.getTime())) continue
      if (e.result === 'win') dow[d.getDay()].wins++; else dow[d.getDay()].losses++
    }

    return { wins, losses, decided, winRate, netPnl, avgWin, avgLoss, profitFactor, curve, pairs, dow, tradeCount: withPnl.length }
  }, [entries])

  if (a.tradeCount === 0 && a.decided === 0) {
    return (
      <div className="bg-surface rounded-xl border border-line p-12 text-center">
        <BarChart3 className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
        <p className="text-ink3">Log trades with a result and P&amp;L to see your analytics — win rate, equity curve, and stats by pair.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile icon={TrendingUp} label="Net P&L" value={money(a.netPnl)} tone={a.netPnl >= 0 ? 'green' : 'red'} />
        <Tile icon={Target} label="Win rate" value={a.winRate != null ? `${a.winRate}%` : '—'} sub={`${a.wins}W · ${a.losses}L`} />
        <Tile icon={Scale} label="Avg win / loss" value={`${money(a.avgWin)}`} sub={`vs ${money(a.avgLoss)}`} />
        <Tile icon={BarChart3} label="Profit factor" value={a.profitFactor === Infinity ? '∞' : a.profitFactor.toFixed(2)} />
      </div>

      {/* Equity curve */}
      {a.curve.length > 1 && (
        <div className="bg-surface rounded-xl border border-line p-4">
          <p className="text-xs font-semibold text-ink2 mb-3">Equity curve (cumulative P&amp;L)</p>
          <EquityCurve values={a.curve} />
        </div>
      )}

      {/* By pair */}
      {a.pairs.length > 0 && (
        <div className="bg-surface rounded-xl border border-line p-4">
          <p className="text-xs font-semibold text-ink2 mb-3">By pair</p>
          <div className="space-y-2">
            {a.pairs.map(p => (
              <div key={p.sym} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink w-20 shrink-0 truncate">{p.sym}</span>
                <span className="text-xs text-ink3 w-24 shrink-0">{p.winRate}% · {p.trades} trade{p.trades !== 1 ? 's' : ''}</span>
                <div className="flex-1" />
                <span className={`text-sm font-bold tabular-nums ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{money(p.pnl)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By day of week */}
      {a.dow.some(d => d.wins + d.losses > 0) && (
        <div className="bg-surface rounded-xl border border-line p-4">
          <p className="text-xs font-semibold text-ink2 mb-3">Win rate by day</p>
          <div className="flex items-end justify-between gap-2 h-24">
            {a.dow.map((d, i) => {
              const total = d.wins + d.losses
              const wr = total ? Math.round((d.wins / total) * 100) : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-elevated rounded-t relative flex items-end" style={{ height: '100%' }}>
                    <div className="w-full bg-yellow-500 rounded-t" style={{ height: `${total ? wr : 0}%` }} title={`${wr}% (${total} trades)`} />
                  </div>
                  <span className="text-[10px] text-ink3">{DOW[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ icon: Icon, label, value, sub, tone }: { icon: typeof Target; label: string; value: string; sub?: string; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink3 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5 text-yellow-500" /> {label}
      </div>
      <p className={`mt-1 text-lg font-black tabular-nums ${tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-red-400' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-[10px] text-ink3 mt-0.5">{sub}</p>}
    </div>
  )
}

function EquityCurve({ values }: { values: number[] }) {
  const W = 600, H = 120, pad = 4
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return [x, y]
  })
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`
  const up = values[values.length - 1] >= 0
  const color = up ? '#22c55e' : '#ef4444'
  const zeroY = H - pad - ((0 - min) / range) * (H - pad * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 4" className="text-ink3" />
      <path d={area} fill="url(#eqfill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
