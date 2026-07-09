'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useMyProfile } from '@/lib/useMyProfile'
import { openTour } from '@/components/WelcomeTour'
import {
  Home, Bell, Settings, Users,
  BookOpen, NotebookPen, CalendarDays, ShieldCheck, Newspaper, Shield, Lock,
  LineChart, Zap, CandlestickChart, Radio, MessageCircle, UserCheck, Calculator, Sparkles, Trophy, CalendarClock,
} from 'lucide-react'

// Core, daily-use features — kept at the top.
const primaryNav = [
  { href: '/ideas',        label: 'Signals',       icon: Zap             },
  { href: '/feed',         label: 'Feed',          icon: Home            },
  { href: '/chat',         label: 'Chat',          icon: MessageCircle   },
  { href: '/chart',        label: 'Trading View',  icon: LineChart       },
  { href: '/trading',      label: 'Trading',       icon: CandlestickChart, premium: true },
]

// Secondary features — shown below a divider.
const moreNav = [
  { href: '/live',         label: 'Live',          icon: Radio,           premium: true },
  { href: '/education',    label: 'Education',     icon: BookOpen,        premium: true },
  { href: '/journal',      label: 'Journal',       icon: NotebookPen,     premium: true },
  { href: '/calendar',     label: 'Calendar',      icon: CalendarDays,    premium: true },
  { href: '/calculator',   label: 'Calculator',    icon: Calculator      },
  { href: '/leaderboard',  label: 'Leaderboard',   icon: Trophy          },
  { href: '/events',       label: 'Econ Calendar', icon: CalendarClock   },
  { href: '/news',         label: 'Forex News',    icon: Newspaper       },
  { href: '/friends',      label: 'Traders',       icon: Users           },
  { href: '/anti-hacking', label: 'Anti-Hacking',  icon: ShieldCheck,     premium: true },
]

// Utility — always last.
const utilityNav = [
  { href: '/notifications',label: 'Notifications', icon: Bell            },
  { href: '/settings',     label: 'Settings',      icon: Settings        },
]

// Mirrors hasAccess(): ACCM members are free, staff are free, active/comp are
// free, and other-broker members are free during their trial. Only a non-ACCM
// member whose trial ended without a subscription is locked out of premium.
function isLockedOut(user?: {
  role?: string | null; subscriptionStatus?: string | null
  accmMember?: boolean | null; trialEndsAt?: string | null
}) {
  if (!user) return true
  if (user.role === 'admin' || user.role === 'coach') return false
  if (user.accmMember) return false
  if (['active', 'comp'].includes(user.subscriptionStatus ?? '')) return false
  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) return false
  return true
}

export function LeftSidebar({ paywallEnabled = false }: { paywallEnabled?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const me = useMyProfile({ image: session?.user?.image, name: session?.user?.name })
  const [unread, setUnread] = useState(0)
  const [roomDot, setRoomDot] = useState(false)
  const [pending, setPending] = useState(0)
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  useEffect(() => {
    const poll = () => {
      if (document.hidden) return
      fetch('/api/chat/unread').then(r => r.json()).then(d => {
        setUnread(d.count || 0)
        const seen = Number(localStorage.getItem('ght:chatSeenAt') || 0)
        setRoomDot(!!d.lastRoomAt && new Date(d.lastRoomAt).getTime() > seen)
      }).catch(() => {})
      if (isStaff) fetch('/api/staff/approvals/count').then(r => r.json()).then(d => setPending(d.count || 0)).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 45000)
    return () => clearInterval(id)
  }, [isStaff])

  // Opening the chat marks room messages as seen and clears the dot.
  useEffect(() => {
    if (pathname === '/chat') { localStorage.setItem('ght:chatSeenAt', String(Date.now())); setRoomDot(false) }
  }, [pathname])

  const locked = paywallEnabled && isLockedOut(session?.user)
  const role = session?.user?.role
  const utility = [...utilityNav]
  if (role === 'admin' || role === 'coach') utility.push({ href: '/approvals', label: 'Approvals', icon: UserCheck })
  if (role === 'admin') utility.push({ href: '/admin', label: 'Admin', icon: Shield })

  const NavLink = ({ href, label, icon: Icon, premium }: { href: string; label: string; icon: typeof Home; premium?: boolean }) => (
    <Link key={href} href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
        pathname === href
          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
          : 'text-ink2 hover:bg-elevated hover:text-ink'
      )}>
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {href === '/chat' && unread > 0 && (
        <span className="ml-auto shrink-0 min-w-4 h-4 px-1 rounded-full bg-yellow-500 text-black text-[10px] font-bold grid place-items-center">{unread}</span>
      )}
      {href === '/chat' && unread === 0 && roomDot && (
        <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-yellow-500" />
      )}
      {href === '/approvals' && pending > 0 && (
        <span className="ml-auto shrink-0 min-w-4 h-4 px-1 rounded-full bg-yellow-500 text-black text-[10px] font-bold grid place-items-center">{pending}</span>
      )}
      {premium && locked && <Lock className="w-3 h-3 ml-auto shrink-0 text-ink3" />}
    </Link>
  )

  return (
    <aside className="hidden lg:flex flex-col gap-1 w-56 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      {session?.user && (
        <Link
          href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors mb-2 border border-line bg-surface"
        >
          <Avatar src={me.image} name={me.name || session.user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{session.user.name}</p>
            <p className="text-xs text-yellow-500 truncate">@{(session.user as { username?: string }).username || 'trader'}</p>
          </div>
        </Link>
      )}

      <button onClick={openTour} className="mb-2 flex items-center gap-2 rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-3 py-2 text-xs font-semibold text-yellow-500 hover:bg-yellow-500/10 transition-colors">
        <Sparkles className="w-4 h-4" /> Take a tour
      </button>

      <div className="space-y-0.5">
        {primaryNav.map(item => <NavLink key={item.href} {...item} />)}
      </div>

      <div className="my-2 mx-3 border-t border-line" />

      <div className="space-y-0.5">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink3">More</p>
        {moreNav.map(item => <NavLink key={item.href} {...item} />)}
        {utility.map(item => <NavLink key={item.href} {...item} />)}
      </div>

      <p className="text-xs text-ink3 px-3 mt-4">© 2026 GHT Trading</p>
    </aside>
  )
}
