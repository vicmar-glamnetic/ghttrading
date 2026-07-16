'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ShieldAlert, X } from 'lucide-react'

interface Risk {
  date: string
  pnl: number
  r: number | null
  trades: number
  losses: number
  lossLimit: number | null
  maxTrades: number | null
  lossHit: boolean
  tradesHit: boolean
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

/** Local YYYY-MM-DD — the member's trading day, not the server's UTC one. */
function localDate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The unglamorous feature that does more for a member's survival than any
 * signal: when today's damage has hit the limit they set for themselves, say so
 * — loudly, at the moment they're about to take another trade.
 *
 * Advisory by design. It never blocks the page: a member who overrides it has
 * made a decision, and a hard lock would just push them to their broker app
 * where nothing is logged at all.
 */
export function RiskGuard() {
  const [risk, setRisk] = useState<Risk | null>(null)
  // The day the member last dismissed this. Read alongside the fetch rather than
  // in an effect keyed on `risk` — localStorage isn't available during SSR, and
  // deriving state in an effect just causes a second render.
  const [dismissedDate, setDismissedDate] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/risk/today?date=${localDate()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && !d.error) {
          setRisk(d)
          setDismissedDate(localStorage.getItem('ght:riskDismissed'))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // Re-check when the member comes back to the tab — they've likely just
    // journalled the trade that crosses the line.
    const onVis = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [load])

  // Dismissal is scoped to the day it was made — tomorrow is a fresh start.
  const dismissed = risk != null && dismissedDate === risk.date
  if (!risk || (!risk.lossHit && !risk.tradesHit) || dismissed) return null

  function dismiss() {
    if (!risk) return
    localStorage.setItem('ght:riskDismissed', risk.date)
    setDismissedDate(risk.date)
  }

  const reasons: string[] = []
  if (risk.lossHit && risk.lossLimit != null) {
    reasons.push(`you're down ${money(risk.pnl)} against your ${money(-Math.abs(risk.lossLimit))} daily limit`)
  }
  if (risk.tradesHit && risk.maxTrades != null) {
    reasons.push(`you've taken ${risk.trades} of your ${risk.maxTrades} trades for the day`)
  }

  return (
    <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-400">Stop trading for today</p>
          <p className="text-xs text-ink2 mt-1 leading-relaxed">
            Today {reasons.join(' and ')}
            {risk.r != null && <> ({risk.r >= 0 ? '+' : ''}{risk.r.toFixed(2)}R)</>}.
            {' '}You set that limit when you were thinking clearly. The market is open tomorrow.
          </p>
          <div className="flex items-center gap-3 mt-2.5">
            <Link href="/journal" className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
              Review today&apos;s trades →
            </Link>
            <Link href="/settings" className="text-xs text-ink3 hover:text-ink2 transition-colors">
              Adjust limits
            </Link>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss for today"
          className="p-1 rounded-lg text-ink3 hover:text-ink hover:bg-red-400/10 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
