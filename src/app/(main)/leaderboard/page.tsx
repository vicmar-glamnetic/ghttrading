'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Trophy, Medal, Flame, TrendingUp, DollarSign, Percent, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Row {
  id: string; name: string | null; username: string | null; image: string | null
  pips: number; pipTrades: number; trades: number; decided: number
  winRate: number | null; entries: number; activeThisWeek: boolean
  /** Position on the cash boards. The figures behind them never leave the server. */
  amountRank: number | null; avgRank: number | null
}

// A rate or an average off one lucky trade isn't a record. The boards that
// divide by trade count only rank members with enough trades to mean something;
// the running totals (pips, amount) have no such problem and rank everyone.
const MIN_RANKED_TRADES = 5

const medal = ['🥇', '🥈', '🥉']

// Cash boards show their standing, not the money. Members compete on the
// ranking without publishing what their account is worth.
const MASKED = 'xxx'
const byRank = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity)

const signed = (n: number) => (n > 0 ? '+' : '') + n.toLocaleString(undefined, { maximumFractionDigits: 0 })
const tone = (n: number) => (n > 0 ? 'text-green-400' : n < 0 ? 'text-red-400' : 'text-ink3')

interface Category {
  key: string
  label: string
  icon: typeof Trophy
  /** Members with nothing to rank on this metric sit the board out. */
  eligible: (r: Row) => boolean
  /** Higher sorts first; ties broken by how much work is behind the number. */
  rank: (a: Row, b: Row) => number
  value: (r: Row) => string
  valueClass: (r: Row) => string
  detail: (r: Row) => string
  note: string
}

const CATEGORIES: Category[] = [
  {
    key: 'pips',
    label: 'Pips',
    icon: TrendingUp,
    eligible: r => r.pipTrades > 0,
    rank: (a, b) => b.pips - a.pips || b.pipTrades - a.pipTrades,
    value: r => signed(r.pips),
    valueClass: r => tone(r.pips),
    detail: r => `${r.pipTrades} priced trade${r.pipTrades !== 1 ? 's' : ''}`,
    note: 'Pips banked across journaled trades that recorded an entry and exit price. Crypto and indices move in points, not pips, so they sit this board out.',
  },
  {
    key: 'amount',
    label: 'Amount',
    icon: DollarSign,
    eligible: r => r.amountRank != null,
    rank: (a, b) => byRank(a.amountRank, b.amountRank),
    value: () => MASKED,
    valueClass: () => 'text-ink3 tracking-[0.2em]',
    detail: r => `${r.trades} trade${r.trades !== 1 ? 's' : ''}`,
    note: 'Ranked by net journaled P&L. The amounts stay private — only the standing is public.',
  },
  {
    key: 'winrate',
    label: 'Win Rate',
    icon: Percent,
    eligible: r => r.winRate != null && r.decided >= MIN_RANKED_TRADES,
    rank: (a, b) => (b.winRate ?? 0) - (a.winRate ?? 0) || b.decided - a.decided,
    value: r => `${r.winRate}%`,
    valueClass: r => ((r.winRate ?? 0) >= 50 ? 'text-green-400' : 'text-red-400'),
    detail: r => `${r.decided} decided`,
    note: `Share of decided trades won — breakevens don't count either way. Needs ${MIN_RANKED_TRADES}+ decided trades to rank.`,
  },
  {
    key: 'avg',
    label: 'Avg / Trade',
    icon: Scale,
    eligible: r => r.avgRank != null && r.trades >= MIN_RANKED_TRADES,
    rank: (a, b) => byRank(a.avgRank, b.avgRank),
    value: () => MASKED,
    valueClass: () => 'text-ink3 tracking-[0.2em]',
    detail: r => `${r.trades} trade${r.trades !== 1 ? 's' : ''}`,
    note: `Ranked by net P&L divided by trades — consistency, not one big day. Amounts stay private. Needs ${MIN_RANKED_TRADES}+ trades to rank.`,
  },
]

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(CATEGORIES[0].key)

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const cat = CATEGORIES.find(c => c.key === tab) ?? CATEGORIES[0]
  const ranked = useMemo(
    () => rows.filter(cat.eligible).sort(cat.rank).slice(0, 50),
    [rows, cat]
  )

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Leaderboard</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              key === tab
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                : 'border-line bg-surface text-ink2 hover:bg-elevated hover:text-ink'
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
      ) : ranked.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center">
          <Medal className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">
            {rows.length === 0
              ? 'No one’s on the leaderboard yet.'
              : `No one qualifies for ${cat.label} yet.`}
          </p>
          <p className="text-xs text-ink3 mt-1">Log trades in your Journal and turn on <Link href="/settings" className="text-yellow-500 hover:underline">Share my stats</Link> in Settings to join.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {ranked.map((r, i) => (
            <Link key={r.id} href={`/profile/${r.id}`}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-elevated ${i < 3 ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-line bg-surface'}`}>
              <span className="w-6 text-center text-sm font-black text-ink3 shrink-0">{i < 3 ? medal[i] : i + 1}</span>
              <Avatar src={r.image} name={r.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink truncate">
                  <span className="truncate">{r.name || 'Trader'}</span>
                  {r.activeThisWeek && (
                    <span title="Journaled this week" className="flex items-center gap-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 shrink-0">
                      <Flame className="w-2.5 h-2.5 fill-orange-400" /> Active
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-ink3">{cat.detail(r)}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${cat.valueClass(r)}`}>{cat.value(r)}</span>
            </Link>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">{cat.note} Only members who opted in appear. Self-reported — for fun &amp; motivation.</p>
    </div>
  )
}
