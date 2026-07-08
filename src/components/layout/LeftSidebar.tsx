'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import {
  Home, Bell, Settings, Users,
  Globe, BookOpen, NotebookPen, CalendarDays, ShieldCheck, Newspaper, Shield, Lock,
  LineChart, Zap, CandlestickChart, Radio, MessageCircle, Smartphone, UserCheck,
} from 'lucide-react'

const navItems = [
  { href: '/ideas',        label: 'Signals',       icon: Zap             },
  { href: '/feed',         label: 'Feed',          icon: Home            },
  { href: '/chat',         label: 'Chat',          icon: MessageCircle   },
  { href: '/chart',        label: 'Trading View',  icon: LineChart       },
  { href: '/trading',      label: 'Trading',       icon: CandlestickChart, premium: true },
  { href: '/live',         label: 'Live',          icon: Radio,           premium: true },
  { href: '/education',    label: 'Education',     icon: BookOpen,        premium: true },
  { href: '/journal',      label: 'Journal',       icon: NotebookPen,     premium: true },
  { href: '/calendar',     label: 'Calendar',      icon: CalendarDays,    premium: true },
  { href: '/anti-hacking', label: 'Anti-Hacking',  icon: ShieldCheck,     premium: true },
  { href: '/news',         label: 'Forex News',    icon: Newspaper       },
  { href: '/friends',      label: 'Traders',       icon: Users           },
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
      <p className="text-xs text-ink2 leading-relaxed">{tip}</p>
    </div>
  )
}

export function LeftSidebar({ paywallEnabled = false }: { paywallEnabled?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const poll = () => { if (document.hidden) return; fetch('/api/chat/unread').then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {}) }
    poll()
    const id = setInterval(poll, 45000)
    return () => clearInterval(id)
  }, [])

  const locked = paywallEnabled && isLockedOut(session?.user)
  const role = session?.user?.role
  const items = [...navItems]
  if (role === 'admin' || role === 'coach') items.push({ href: '/approvals', label: 'Approvals', icon: UserCheck })
  if (role === 'admin') items.push({ href: '/admin', label: 'Admin', icon: Shield })

  return (
    <aside className="hidden lg:flex flex-col gap-1 w-56 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4 scrollbar-none">
      {session?.user && (
        <Link
          href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors mb-2 border border-line bg-surface"
        >
          <Avatar src={session.user.image} name={session.user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{session.user.name}</p>
            <p className="text-xs text-yellow-500 truncate">@{(session.user as { username?: string }).username || 'trader'}</p>
          </div>
        </Link>
      )}

      <div className="space-y-0.5">
        {items.map(({ href, label, icon: Icon, premium }) => (
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
            {premium && locked && <Lock className="w-3 h-3 ml-auto shrink-0 text-ink3" />}
          </Link>
        ))}
      </div>

      {/* Gold tip */}
      <GoldTip />

      {/* Discord CTA */}
      <div className="mt-3 mx-3 p-3 rounded-xl bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">JOIN DISCORD</span>
        </div>
        <p className="text-xs text-ink2">Live gold sessions Mon–Fri</p>
        <a
          href="https://discord.gg/ghttrading"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1.5 rounded-lg transition-colors"
        >
          Join Now
        </a>
      </div>

      <Link href="/install" className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink2 hover:text-yellow-500 hover:border-yellow-500/30 transition-colors">
        <Smartphone className="w-4 h-4" /> Install as app
      </Link>

      <p className="text-xs text-ink3 px-3 mt-3">© 2026 GHT Trading</p>
    </aside>
  )
}
