import { CalendarClock } from 'lucide-react'
import { EconomicCalendar } from './EconomicCalendar'
import { fetchCalendar } from './feed'

export const metadata = { title: 'Forex News · Gold Heist Trading' }
export const revalidate = 900 // refresh at most every 15 min — the feed rate-limits hard

export default async function NewsPage() {
  const events = await fetchCalendar()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Forex News</h1>
        <span className="ml-auto text-xs text-ink3">Upcoming USD releases · this week</span>
      </div>

      {events.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <CalendarClock className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">Couldn&apos;t load the calendar right now. Please check back shortly.</p>
        </div>
      ) : (
        <EconomicCalendar events={events} />
      )}

      <p className="text-[10px] text-ink3 text-center">
        USD events from the ForexFactory economic calendar. Updated periodically.
      </p>
    </div>
  )
}
