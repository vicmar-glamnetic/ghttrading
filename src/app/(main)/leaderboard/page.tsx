'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Trophy, Medal } from 'lucide-react'

interface Row { id: string; name: string | null; username: string | null; image: string | null; pnl: number; trades: number; winRate: number | null }

const money = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const medal = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Leaderboard</h1>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center">
          <Medal className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">No one&rsquo;s on the leaderboard yet.</p>
          <p className="text-xs text-ink3 mt-1">Log trades in your Journal and turn on <Link href="/settings" className="text-yellow-500 hover:underline">Share my stats</Link> in Settings to join.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <Link key={r.id} href={`/profile/${r.id}`}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-elevated ${i < 3 ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-line bg-surface'}`}>
              <span className="w-6 text-center text-sm font-black text-ink3 shrink-0">{i < 3 ? medal[i] : i + 1}</span>
              <Avatar src={r.image} name={r.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{r.name || 'Trader'}</p>
                <p className="text-[11px] text-ink3">{r.winRate != null ? `${r.winRate}% win` : '—'} · {r.trades} trade{r.trades !== 1 ? 's' : ''}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${r.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{money(r.pnl)}</span>
            </Link>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">Ranked by journaled net P&amp;L. Only members who opted in appear. Self-reported — for fun &amp; motivation.</p>
    </div>
  )
}
