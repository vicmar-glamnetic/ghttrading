'use client'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { TrendingUp, Target, Activity, Trophy } from 'lucide-react'

interface Coach { id: string; name: string | null; image: string | null; wins: number; losses: number; total: number; winRate: number }
interface Month { month: string; wins: number; losses: number; total: number; winRate: number }
interface Stats {
  total: number; open: number; wins: number; losses: number; closed: number
  winRate: number | null; avgRR: number | null
  goldPips?: { week: number; month: number; all: number }
  other?: OtherSymbol[]
  coaches: Coach[]; months: Month[]
}
interface OtherSymbol { symbol: string; unit: 'pips' | 'points'; week: number; all: number; wins: number; losses: number }

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function PerformancePanel() {
  const [s, setS] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ideas/stats').then(r => r.json()).then(d => setS(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-72 bg-surface rounded-xl border border-line animate-pulse max-w-xl mx-auto" />
  if (!s || s.closed === 0) {
    return (
      <div className="bg-surface rounded-xl border border-line p-12 text-center max-w-xl mx-auto">
        <Activity className="w-12 h-12 text-yellow-500/30 mx-auto mb-4" />
        <p className="text-ink3">No closed signals yet — performance shows up once signals hit TP or SL.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink3 uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-yellow-500" /> Win rate
          </div>
          <p className="mt-1 text-3xl font-black text-yellow-500 tabular-nums">{s.winRate ?? 0}%</p>
          <p className="text-xs text-ink3 mt-0.5">{s.wins}W · {s.losses}L over {s.closed} closed</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink3 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-500" /> Avg R:R
          </div>
          <p className="mt-1 text-3xl font-black text-ink tabular-nums">{s.avgRR != null ? `1:${s.avgRR}` : '—'}</p>
          <p className="text-xs text-ink3 mt-0.5">{s.open} open · {s.total} total</p>
        </div>
      </div>

      {/* Gold pips banked */}
      {s.goldPips && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold text-ink2 mb-3">Gold pips banked 🎯</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'This week', v: s.goldPips.week },
              { label: 'This month', v: s.goldPips.month },
              { label: 'All-time', v: s.goldPips.all },
            ].map(({ label, v }) => (
              <div key={label}>
                <p className={`text-xl font-black tabular-nums ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>{signed(v)}</p>
                <p className="text-[10px] text-ink3 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {s.other && s.other.length > 0 && (
            <div className="mt-3 pt-3 border-t border-line">
              <p className="text-[10px] text-ink3 uppercase tracking-wider mb-2">Other symbols</p>
              <div className="flex items-center gap-3 text-[10px] text-ink3 uppercase tracking-wider mb-1">
                <span className="w-20 shrink-0" />
                <span className="flex-1" />
                <span className="w-20 text-right shrink-0">This week</span>
                <span className="w-24 text-right shrink-0">All-time</span>
              </div>
              <div className="space-y-1.5">
                {s.other.map(o => (
                  <div key={o.symbol} className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-ink2 w-20 shrink-0">{o.symbol}</span>
                    <span className="text-ink3 tabular-nums flex-1">{o.wins}W/{o.losses}L</span>
                    <span className={`font-bold tabular-nums w-20 text-right shrink-0 ${o.week >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {signed(o.week)}
                    </span>
                    <span className={`font-bold tabular-nums w-24 text-right shrink-0 ${o.all >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {signed(o.all)} <span className="font-normal text-ink3">{o.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-ink3">
                Banked per symbol, not summed — a pip on gold isn&rsquo;t a pip on EURUSD or a point on ETH.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Win/loss bar */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold text-ink2 mb-2">Closed signal outcomes</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-elevated">
          <div className="bg-green-500" style={{ width: `${s.closed ? (s.wins / s.closed) * 100 : 0}%` }} />
          <div className="bg-red-500" style={{ width: `${s.closed ? (s.losses / s.closed) * 100 : 0}%` }} />
        </div>
        <div className="flex justify-between text-[11px] mt-1.5">
          <span className="text-green-400 font-semibold">{s.wins} wins</span>
          <span className="text-red-400 font-semibold">{s.losses} losses</span>
        </div>
      </div>

      {/* Monthly breakdown */}
      {s.months.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold text-ink2 mb-3">Monthly results</p>
          <div className="space-y-2.5">
            {s.months.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-ink2 w-20 shrink-0">{monthLabel(m.month)}</span>
                <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: `${m.winRate}%` }} />
                </div>
                <span className="text-xs font-semibold text-ink tabular-nums w-24 text-right shrink-0">{m.winRate}% · {m.wins}/{m.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top coaches */}
      {s.coaches.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Coach leaderboard
          </p>
          <div className="space-y-2">
            {s.coaches.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink3 w-4 tabular-nums">{i + 1}</span>
                <Avatar src={c.image} name={c.name} size="xs" />
                <span className="text-sm text-ink truncate flex-1">{c.name || 'Coach'}</span>
                <span className="text-xs text-ink3 tabular-nums">{c.wins}W/{c.losses}L</span>
                <span className="text-sm font-bold text-yellow-500 tabular-nums w-12 text-right">{c.winRate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">
        Based on public signals marked TP-hit or SL-hit. A TP close counts as a win at TP2 — or at TP1 alone only if it ran more than 20 pips, otherwise it&rsquo;s booked as a loss. Win rate &amp; counts are exact; R:R is the planned reward:risk from posted levels. Past results don&rsquo;t guarantee future performance.
      </p>
    </div>
  )
}
