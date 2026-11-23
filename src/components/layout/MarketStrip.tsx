'use client'
import { useEffect, useRef, useState } from 'react'
import { isGoldMarketOpen } from '@/lib/marketHours'

/** Which FX session is running right now (UTC hours, approximate). */
function sessionName(d = new Date()): string {
  const h = d.getUTCHours()
  if (h >= 12 && h < 16) return 'London / NY'
  if (h >= 7 && h < 12) return 'London'
  if (h >= 16 && h < 21) return 'New York'
  return 'Asia'
}

/**
 * Market line for the top bar: live XAU/USD (flashes on a tick),
 * whether gold is trading, and the current session.
 */
export function MarketStrip() {
  const [price, setPrice] = useState<number | null>(null)
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  const [open, setOpen] = useState<boolean | null>(null)
  const [session, setSession] = useState('')
  const last = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setOpen(isGoldMarketOpen())
      setSession(sessionName())
      if (document.hidden) return
      try {
        const r = await fetch('/api/price?symbol=XAUUSD', { cache: 'no-store' })
        const d = await r.json()
        if (!alive || typeof d?.price !== 'number') return
        if (last.current != null && d.price !== last.current) {
          setDir(d.price > last.current ? 'up' : 'down')
          setTimeout(() => alive && setDir(null), 1200)
        }
        last.current = d.price
        setPrice(d.price)
      } catch {}
    }
    load()
    const id = setInterval(load, 20_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-ink3 min-w-0">
      <span className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full sm:hidden ${open ? 'bg-green-400' : 'bg-ink3'}`} aria-hidden />
        <span className="text-ink2">XAU/USD</span>
        <span
          className={`rounded-sm px-1 tabular-nums transition-colors ${
            dir === 'up' ? 'bg-green-500/20 text-green-400' : dir === 'down' ? 'bg-red-500/20 text-red-400' : 'text-ink'
          }`}
        >
          {price != null
            ? <span key={price} className="price-tick">{price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            : '—'}
        </span>
      </span>
      {open != null && (
        <span className="hidden sm:flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-green-400' : 'bg-ink3'}`} />
          {open ? 'Market open' : 'Market closed'}
        </span>
      )}
      {open && <span className="hidden lg:inline">{session} session</span>}
    </div>
  )
}
