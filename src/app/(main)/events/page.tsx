'use client'
import { useEffect, useRef } from 'react'
import { CalendarClock } from 'lucide-react'

// TradingView economic calendar — NFP, CPI, FOMC, etc. (the events that move gold).
function EventsWidget() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    s.async = true
    s.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: '0,1',
      countryFilter: 'us,eu,gb,jp,cn,ca,au,ch,nz',
    })
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [])
  return <div ref={ref} className="h-full w-full bg-[#0d0d14]" />
}

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Economic Calendar</h1>
      </div>
      <p className="text-xs text-ink2">
        High-impact events (NFP, CPI, FOMC, rate decisions) move gold hard — check the calendar before you trade around the news.
      </p>
      <div className="bg-surface rounded-xl border border-line overflow-hidden h-[calc(100vh-13rem)] min-h-[440px]">
        <EventsWidget />
      </div>
    </div>
  )
}
