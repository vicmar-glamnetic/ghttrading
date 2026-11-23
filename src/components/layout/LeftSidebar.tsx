'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useMyProfile } from '@/lib/useMyProfile'
import { useLiveStatus } from '@/lib/useLiveStatus'
import { anyRoomUnseen, SEEN_EVENT } from '@/lib/chatSeen'
import {
  Home, Bell, Settings, Users,
  BookOpen, NotebookPen, CalendarDays, ShieldCheck, Newspaper, Shield, Lock,
  LineChart, Zap, CandlestickChart, Radio, MessageCircle, UserCheck, Calculator, Trophy,
  GraduationCap, BadgeCheck,
} from 'lucide-react'

type RailItem = { href: string; label: string; icon: typeof Home; premium?: boolean }

// Core, daily-use features — kept at the top. Labels are short: they sit under
// the icon in a 76px rail.
const primaryNav: RailItem[] = [
  { href: '/ideas',        label: 'Signals',    icon: Zap             },
  { href: '/feed',         label: 'Feed',       icon: Home            },
  { href: '/chat',         label: 'Chat',       icon: MessageCircle   },
  { href: '/chart',        label: 'Chart',      icon: LineChart       },
  { href: '/trading',      label: 'Trade',      icon: CandlestickChart, premium: true },
  { href: '/journal',      label: 'Journal',    icon: NotebookPen,     premium: true },
]

// Secondary features — shown below a divider.
const moreNav: RailItem[] = [
  { href: '/live',         label: 'Live',       icon: Radio,           premium: true },
  { href: '/courses',      label: 'Courses',    icon: GraduationCap,   premium: true },
  { href: '/education',    label: 'Education',  icon: BookOpen,        premium: true },
  { href: '/calendar',     label: 'Calendar',   icon: CalendarDays,    premium: true },
  { href: '/calculator',   label: 'Lot size',   icon: Calculator      },
  { href: '/leaderboard',  label: 'Ranks',      icon: Trophy          },
  { href: '/news',         label: 'News',       icon: Newspaper       },
  { href: '/friends',      label: 'Traders',    icon: Users           },
  { href: '/anti-hacking', label: 'Security',   icon: ShieldCheck,     premium: true },
]

// Utility — always last.
const utilityNav: RailItem[] = [
  { href: '/notifications',label: 'Alerts',     icon: Bell            },
  { href: '/settings',     label: 'Settings',   icon: Settings        },
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
  const rooms = useRef<Record<string, string>>({})
  const [pending, setPending] = useState(0)
  const [verifying, setVerifying] = useState(0)
  const isLive = useLiveStatus()
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach'

  useEffect(() => {
    const poll = () => {
      if (document.hidden) return
      fetch('/api/chat/unread').then(r => r.json()).then(d => {
        setUnread(d.count || 0)
        rooms.current = d.rooms || {}
        setRoomDot(anyRoomUnseen(rooms.current))
      }).catch(() => {})
      if (isStaff) fetch('/api/staff/approvals/count').then(r => r.json()).then(d => {
        setPending(d.count || 0)
        setVerifying(d.verifications || 0)
      }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 45000)
    return () => clearInterval(id)
  }, [isStaff])

  // The chat page marks rooms read one at a time, so the dot survives opening
  // /chat when a room you didn't look at still has messages.
  useEffect(() => {
    const recompute = () => setRoomDot(anyRoomUnseen(rooms.current))
    window.addEventListener(SEEN_EVENT, recompute)
    return () => window.removeEventListener(SEEN_EVENT, recompute)
  }, [])

  const locked = paywallEnabled && isLockedOut(session?.user)
  // Staff tools sit at the very top of the rail.
  const staff: RailItem[] = isStaff ? [
    { href: '/approvals',     label: 'Approvals', icon: UserCheck  },
    { href: '/verifications', label: 'Verify',    icon: BadgeCheck },
    { href: '/admin',         label: 'Admin',     icon: Shield     },
  ] : []

  // Icon over a tiny label, gold edge on the active page, badges and locks
  // pinned to the icon's corner. A plain function, not a component, so the links
  // aren't remounted on every render.
  const railLink = ({ href, label, icon: Icon, premium }: RailItem) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    const count = href === '/chat' ? unread : href === '/approvals' ? pending : href === '/verifications' ? verifying : 0
    const live = href === '/live' && isLive
    return (
      <Link
        key={href}
        href={href}
        title={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors',
          active ? 'text-yellow-500 bg-yellow-500/10' : 'text-ink2 hover:text-ink hover:bg-elevated',
        )}
      >
        {active && <span className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r bg-yellow-500" aria-hidden />}
        <span className="relative">
          <Icon className="w-[18px] h-[18px]" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-yellow-500 text-black text-[9px] font-bold grid place-items-center">{count > 99 ? '99+' : count}</span>
          )}
          {href === '/chat' && count === 0 && roomDot && <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-yellow-500" />}
          {live && <span title="Live now" className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          {premium && locked && !live && <Lock className="absolute -top-1 -right-2 w-2.5 h-2.5 text-ink3" />}
        </span>
        <span className="text-[10px] leading-tight font-medium">{label}</span>
      </Link>
    )
  }

  const divider = <div className="my-2 mx-2 shrink-0 border-t border-line" />

  return (
    <aside
      className="hidden md:flex flex-col w-[76px] shrink-0 sticky self-start overflow-y-auto scrollbar-none border-r border-line py-3 px-2 gap-0.5"
      style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))', height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))' }}
    >
      {staff.length > 0 && <>{staff.map(railLink)}{divider}</>}
      {primaryNav.map(railLink)}
      {divider}
      {moreNav.map(railLink)}
      {divider}
      {utilityNav.map(railLink)}
      {session?.user && (
        <Link href={`/profile/${session.user.id}`} title="Your profile" className="mt-auto flex justify-center pt-3">
          <Avatar src={me.image} name={me.name || session.user.name} size="sm" />
        </Link>
      )}
    </aside>
  )
}
