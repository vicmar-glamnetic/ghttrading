'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import {
  Home, BookOpen, Bell, Settings, Users,
  Zap, BarChart2, Globe, Clock,
} from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Feed',          icon: Home     },
  { href: '/signals',      label: 'Signals',       icon: Zap      },
  { href: '/analysis',     label: 'Analysis',      icon: BarChart2 },
  { href: '/education',    label: 'Education',     icon: BookOpen },
  { href: '/friends',      label: 'Traders',       icon: Users    },
  { href: '/notifications',label: 'Notifications', icon: Bell     },
  { href: '/settings',     label: 'Settings',      icon: Settings },
]

// Gold trading sessions in UTC hours
const sessions = [
  { name: 'Tokyo',    start: 0,  end: 9,  color: 'bg-blue-400',   textColor: 'text-blue-400'   },
  { name: 'London',   start: 8,  end: 17, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
  { name: 'New York', start: 13, end: 22, color: 'bg-green-400',  textColor: 'text-green-400'  },
]

function GoldSessionClock() {
  const [utcHour, setUtcHour] = useState<number | null>(null)
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const h = now.getUTCHours()
      const m = now.getUTCMinutes().toString().padStart(2, '0')
      setUtcHour(h)
      setUtcTime(`${h.toString().padStart(2, '0')}:${m} UTC`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  if (utcHour === null) return null

  const active = sessions.filter(s => utcHour >= s.start && utcHour < s.end)
  const isMarketOpen = active.length > 0

  return (
    <div className="mx-3 mt-4 p-3 rounded-xl bg-[#16161f] border border-[#2a2a3a]">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Gold Sessions</span>
      </div>
      <p className="text-[10px] text-[#5a5a72] mb-2">{utcTime}</p>
      <div className="space-y-1.5">
        {sessions.map(s => {
          const on = utcHour >= s.start && utcHour < s.end
          return (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', on ? s.color : 'bg-[#3a3a4a]')} />
                <span className={cn('text-xs', on ? s.textColor : 'text-[#5a5a72]')}>{s.name}</span>
              </div>
              <span className={cn('text-[10px]', on ? 'text-[#9090a8]' : 'text-[#3a3a4a]')}>
                {String(s.start).padStart(2,'0')}:00–{String(s.end).padStart(2,'0')}:00
              </span>
            </div>
          )
        })}
      </div>
      <div className={cn(
        'mt-2 pt-2 border-t border-[#2a2a3a] flex items-center gap-1.5 text-[10px] font-bold',
        isMarketOpen ? 'text-green-400' : 'text-red-400'
      )}>
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isMarketOpen ? 'bg-green-400' : 'bg-red-400')} />
        {isMarketOpen
          ? `Active · ${active.map(s => s.name).join(' + ')}`
          : 'Market Closed (Weekend)'}
      </div>
    </div>
  )
}

const goldTips = [
  'Gold tends to spike on US CPI & NFP days.',
  'London open (08:00 UTC) often sets the daily direction.',
  'Watch the DXY — gold moves inverse to the dollar.',
  'Key gold support: round numbers (2300, 2350, 2400).',
  'High volatility: US & London session overlap 13–17 UTC.',
]

function GoldTip() {
  const tip = goldTips[new Date().getDay() % goldTips.length]
  return (
    <div className="mx-3 mt-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
      <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-1">💡 Gold Tip</p>
      <p className="text-xs text-[#9090a8] leading-relaxed">{tip}</p>
    </div>
  )
}

export function LeftSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col gap-1 w-56 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      {session?.user && (
        <Link
          href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2c] transition-colors mb-2 border border-[#2a2a3a] bg-[#16161f]"
        >
          <Avatar src={session.user.image} name={session.user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f8] truncate">{session.user.name}</p>
            <p className="text-xs text-yellow-500 truncate">@{(session.user as { username?: string }).username || 'trader'}</p>
          </div>
        </Link>
      )}

      <div className="space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
              pathname === href
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                : 'text-[#9090a8] hover:bg-[#1e1e2c] hover:text-[#f0f0f8]'
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {/* Gold session clock */}
      <GoldSessionClock />

      {/* Gold tip */}
      <GoldTip />

      {/* Discord CTA */}
      <div className="mt-3 mx-3 p-3 rounded-xl bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">JOIN DISCORD</span>
        </div>
        <p className="text-xs text-[#9090a8]">Live gold sessions Mon–Fri</p>
        <a
          href="https://discord.gg/ghttrading"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1.5 rounded-lg transition-colors"
        >
          Join Now
        </a>
      </div>

      <p className="text-xs text-[#5a5a72] px-3 mt-4">© 2026 GHT Trading</p>
    </aside>
  )
}
