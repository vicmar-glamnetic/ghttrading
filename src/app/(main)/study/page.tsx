import Link from 'next/link'
import { GraduationCap, BookOpen, NotebookPen, CalendarDays, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Study Room · GHT Trading' }

const SECTIONS = [
  { href: '/education', icon: BookOpen,     title: 'Education',  desc: 'Video tutorials & lessons from our coaches.' },
  { href: '/journal',   icon: NotebookPen,  title: 'Journal',    desc: 'Log your trades, notes and reflections.' },
  { href: '/calendar',  icon: CalendarDays, title: 'Calendar',   desc: 'Your trading P&L calendar and stats.' },
]

export default function StudyRoomPage() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
          <GraduationCap className="w-7 h-7 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-black text-ink">Study Room</h1>
        <p className="text-ink2 text-sm mt-1">Everything you need to learn and track your trading — in one place.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-line bg-surface p-5 hover:border-yellow-500/40 hover:bg-elevated transition-colors flex flex-col"
          >
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-base font-bold text-ink">{title}</p>
            <p className="text-xs text-ink3 mt-1 flex-1">{desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yellow-500">
              Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
