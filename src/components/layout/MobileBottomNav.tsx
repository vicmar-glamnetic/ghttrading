'use client'
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { cn, getInitials } from '@/lib/utils'
import {
  Home, LineChart, Zap, Newspaper, X, Lock, MessageCircle, NotebookPen, CalendarDays, Users, Bell, Settings,
  Shield, ShieldCheck, User, LogOut, Smartphone, Calculator, Sparkles, Trophy, GraduationCap, CandlestickChart,
  Radio, BookOpen, UserCheck, BadgeCheck,
} from 'lucide-react'
import { openTour } from '@/components/WelcomeTour'
import { useLiveStatus } from '@/lib/useLiveStatus'
import { anyRoomUnseen, SEEN_EVENT } from '@/lib/chatSeen'
import { useMyProfile } from '@/lib/useMyProfile'

/** Fired by the ☰ button in the top bar (phones and tablets). */
export const OPEN_DRAWER_EVENT = 'ght:open-drawer'
/** Fired by the drawer so the ☰ button can show a badge: { count, live }. */
export const DRAWER_BADGE_EVENT = 'ght:drawer-badge'
/** Fired by the Navbar whenever the unread-notification count changes. */
export const NOTIF_COUNT_EVENT = 'ght:notif-count'

export function openDrawer() {
  window.dispatchEvent(new Event(OPEN_DRAWER_EVENT))
}

type NavItem = { href: string; label: string; icon: typeof Home; premium?: boolean }

// Side drawer sections, same grouping as the desktop rail.
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Trade',
    items: [
      { href: '/feed',     label: 'Feed',         icon: Home },
      { href: '/ideas',    label: 'Signals',      icon: Zap },
      { href: '/chat',     label: 'Chat',         icon: MessageCircle },
      { href: '/chart',    label: 'Trading View', icon: LineChart },
      { href: '/trading',  label: 'Trading',      icon: CandlestickChart, premium: true },
      { href: '/journal',  label: 'Journal',      icon: NotebookPen,      premium: true },
    ],
  },
  {
    title: 'Learn & tools',
    items: [
      { href: '/live',         label: 'Live',         icon: Radio,         premium: true },
      { href: '/courses',      label: 'Courses',      icon: GraduationCap, premium: true },
      { href: '/education',    label: 'Education',    icon: BookOpen,      premium: true },
      { href: '/calendar',     label: 'Calendar',     icon: CalendarDays,  premium: true },
      { href: '/calculator',   label: 'Calculator',   icon: Calculator },
      { href: '/news',         label: 'Forex News',   icon: Newspaper },
      { href: '/anti-hacking', label: 'Anti-Hacking', icon: ShieldCheck,   premium: true },
    ],
  },
  {
    title: 'Community',
    items: [
      { href: '/friends',     label: 'Traders',     icon: Users },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    title: 'App',
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings',      label: 'Settings',      icon: Settings },
      { href: '/install',       label: 'Install App',   icon: Smartphone },
    ],
  },
]

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

const Badge = ({ n }: { n: number }) => (
  <span className="min-w-5 h-5 px-1.5 rounded-full bg-yellow-500 text-black text-[10px] font-bold grid place-items-center">{n > 99 ? '99+' : n}</span>
)

/**
 * Phones and tablets: a five-tab bar at the bottom (Feed, Signals, Chat, Trade,
 * Profile) and everything else in a side drawer that slides in from the left,
 * opened from the ☰ in the top bar. Notifications stay on the top bar's bell.
 */
export function MobileBottomNav({ paywallEnabled = false }: { paywallEnabled?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const me = useMyProfile({ image: session?.user?.image, name: session?.user?.name })
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifs, setNotifs] = useState(0)
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

  // Open from the top bar's ☰; unread notifications come from the Navbar.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onNotifs = (e: Event) => setNotifs((e as CustomEvent<number>).detail ?? 0)
    window.addEventListener(OPEN_DRAWER_EVENT, onOpen)
    window.addEventListener(NOTIF_COUNT_EVENT, onNotifs)
    return () => {
      window.removeEventListener(OPEN_DRAWER_EVENT, onOpen)
      window.removeEventListener(NOTIF_COUNT_EVENT, onNotifs)
    }
  }, [])

  // Tell the ☰ button what's waiting inside the drawer.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(DRAWER_BADGE_EVENT, { detail: { count: pending + verifying, live: isLive } }))
  }, [pending, verifying, isLive])

  // Close on navigation and on Escape; keep the page from scrolling behind it.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const locked = paywallEnabled && isLockedOut(session?.user)
  const staff: NavItem[] = []
  if (isStaff) {
    staff.push({ href: '/approvals', label: 'Approvals', icon: UserCheck })
    staff.push({ href: '/verifications', label: 'Verifications', icon: BadgeCheck })
    staff.push({ href: '/admin', label: 'Admin', icon: Shield })
  }

  const profileHref = session?.user?.id ? `/profile/${session.user.id}` : '/settings'
  const tabs: NavItem[] = [
    { href: '/feed',          label: 'Feed',    icon: Home },
    { href: '/ideas',         label: 'Signals', icon: Zap },
    { href: '/chat',          label: 'Chat',    icon: MessageCircle },
    { href: '/trading',       label: 'Trade',   icon: CandlestickChart, premium: true },
    { href: profileHref,      label: 'Profile', icon: User },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const badgeFor = (href: string) =>
    href === '/chat' ? unread : href === '/approvals' ? pending : href === '/verifications' ? verifying : href === '/notifications' ? notifs : 0

  // A plain function, not a component, so links aren't remounted on every render.
  const drawerLink = ({ href, label, icon: Icon, premium }: NavItem) => {
    const active = isActive(href)
    const count = badgeFor(href)
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          active ? 'bg-yellow-500/10 text-yellow-500' : 'text-ink2 active:bg-elevated hover:bg-elevated hover:text-ink',
        )}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-yellow-500" aria-hidden />}
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {href === '/live' && isLive && <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black text-red-500">LIVE</span>}
        {count > 0 && <Badge n={count} />}
        {href === '/chat' && count === 0 && roomDot && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
        {premium && locked && !(href === '/live' && isLive) && <Lock className="h-3.5 w-3.5 text-ink3" />}
      </Link>
    )
  }

  return (
    <>
      {/* Side drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer-backdrop absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside
            className="drawer-panel absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col bg-[color:var(--c-app)] border-r border-line shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Who you are */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-4">
              <Link href={profileHref} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line bg-elevated">
                  {me.image
                    ? <img src={me.image} alt="" className="h-full w-full object-cover" />
                    : <span className="grid h-full w-full place-items-center text-sm font-bold text-ink2">{getInitials(me.name || session?.user?.name || 'Me')}</span>}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{me.name || session?.user?.name || 'Member'}</span>
                  <span className="block truncate text-xs text-yellow-500">
                    @{(session?.user as { username?: string } | undefined)?.username || 'trader'}
                  </span>
                </span>
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-ink3 hover:bg-elevated hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
              {staff.length > 0 && (
                <div className="mb-3">
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink3">Staff</p>
                  {staff.map(drawerLink)}
                </div>
              )}
              {SECTIONS.map(section => (
                <div key={section.title} className="mb-3">
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink3">{section.title}</p>
                  {section.items.map(drawerLink)}
                </div>
              ))}
            </nav>

            <div className="space-y-1 border-t border-line p-3">
              <Link
                href="/journal?compose=blank"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-yellow-500 py-2.5 text-sm font-bold text-black active:bg-yellow-400"
              >
                <NotebookPen className="h-4 w-4" /> Log a trade
              </Link>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); openTour() }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-ink2 hover:bg-elevated"
                >
                  <Sparkles className="h-4 w-4" /> App tour
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); signOut({ callbackUrl: '/login' }) }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-red-400 hover:bg-elevated"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Opaque, no backdrop-filter: a fixed element with backdrop-filter gets its
          own compositing layer that iOS Safari intermittently fails to reposition
          while scrolling, leaving the bar painted mid-screen. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-app border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around h-14">
          {tabs.map(({ href, label, icon: Icon, premium }) => {
            const active = isActive(href)
            const count = badgeFor(href)
            const isProfile = label === 'Profile'
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 flex-1 transition-colors',
                  active ? 'text-yellow-500' : 'text-ink3 active:text-ink2'
                )}
              >
                {active && <span className="absolute top-0 inset-x-5 h-[2px] bg-yellow-500" aria-hidden />}
                {count > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-20px)] min-w-4 h-4 px-1 rounded-full bg-yellow-500 text-black text-[9px] font-bold grid place-items-center">{count > 99 ? '99+' : count}</span>
                )}
                {href === '/chat' && count === 0 && roomDot && (
                  <span className="absolute top-2.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-yellow-500" />
                )}
                {premium && locked && (
                  <Lock className="w-3 h-3 absolute top-2.5 right-[calc(50%-16px)] text-ink3" />
                )}
                {isProfile ? (
                  <span className={cn('h-6 w-6 overflow-hidden rounded-full border bg-elevated', active ? 'border-yellow-500' : 'border-line')}>
                    {me.image
                      ? <img src={me.image} alt="" className="h-full w-full object-cover" />
                      : <span className="grid h-full w-full place-items-center text-[9px] font-bold text-ink2">{getInitials(me.name || 'Me')}</span>}
                  </span>
                ) : (
                  <Icon className="w-5 h-5 shrink-0" />
                )}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
