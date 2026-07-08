'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  Home, LineChart, Zap, Newspaper, Menu, X, Lock, MessageCircle,
  CandlestickChart, Radio, BookOpen, NotebookPen, CalendarDays, ShieldCheck, Users, Bell, Settings,
  Shield, User, LogOut, Smartphone, UserCheck,
} from 'lucide-react'

const items = [
  { href: '/ideas', label: 'Signals', icon: Zap          },
  { href: '/feed',  label: 'Feed',    icon: Home         },
  { href: '/chat',  label: 'Chat',    icon: MessageCircle },
  { href: '/chart', label: 'Chart',   icon: LineChart    },
]

// Full navigation shown in the "More" sheet — same priority order as the sidebar.
const allNav = [
  { href: '/ideas',         label: 'Signals',       icon: Zap             },
  { href: '/feed',          label: 'Feed',          icon: Home            },
  { href: '/chat',          label: 'Chat',          icon: MessageCircle   },
  { href: '/chart',         label: 'Trading View',  icon: LineChart       },
  { href: '/trading',       label: 'Trading',       icon: CandlestickChart, premium: true },
  { href: '/live',          label: 'Live',          icon: Radio,           premium: true },
  { href: '/education',     label: 'Education',     icon: BookOpen,        premium: true },
  { href: '/journal',       label: 'Journal',       icon: NotebookPen,     premium: true },
  { href: '/calendar',      label: 'Calendar',      icon: CalendarDays,    premium: true },
  { href: '/news',          label: 'Forex News',    icon: Newspaper       },
  { href: '/friends',       label: 'Traders',       icon: Users           },
  { href: '/anti-hacking',  label: 'Anti-Hacking',  icon: ShieldCheck,     premium: true },
  { href: '/install',       label: 'Install App',   icon: Smartphone      },
  { href: '/notifications', label: 'Notifications', icon: Bell            },
  { href: '/settings',      label: 'Settings',      icon: Settings        },
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

export function MobileBottomNav({ paywallEnabled = false }: { paywallEnabled?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const poll = () => { if (document.hidden) return; fetch('/api/chat/unread').then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {}) }
    poll()
    const id = setInterval(poll, 45000)
    return () => clearInterval(id)
  }, [])

  const locked = paywallEnabled && isLockedOut(session?.user)
  const role = session?.user?.role
  const menu: { href: string; label: string; icon: typeof Home; premium?: boolean }[] = [...allNav]
  if (session?.user?.id) menu.push({ href: `/profile/${session.user.id}`, label: 'Profile', icon: User })
  if (role === 'admin' || role === 'coach') menu.push({ href: '/approvals', label: 'Approvals', icon: UserCheck })
  if (role === 'admin') menu.push({ href: '/admin', label: 'Admin', icon: Shield })

  return (
    <>
      {/* Full-nav sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[color:var(--c-app)] border-t border-line rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink">Menu</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-elevated">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {menu.map(({ href, label, icon: Icon, premium }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href + label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-colors',
                      active
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                        : 'border-line bg-surface text-ink2 active:bg-elevated'
                    )}
                  >
                    {premium && locked && <Lock className="w-3 h-3 absolute top-2 right-2 text-ink3" />}
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                  </Link>
                )
              })}
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: '/login' }) }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-red-400 active:bg-elevated p-3"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[11px] font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0d0d14]/95 backdrop-blur-md border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors',
                  active ? 'text-yellow-500' : 'text-ink3 active:text-ink2'
                )}
              >
                {href === '/chat' && unread > 0 && (
                  <span className="absolute top-2.5 right-[calc(50%-18px)] min-w-4 h-4 px-1 rounded-full bg-yellow-500 text-black text-[9px] font-bold grid place-items-center">{unread}</span>
                )}
                <Icon className="w-6 h-6 shrink-0" />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl text-ink3 active:text-ink2 transition-colors"
          >
            <Menu className="w-6 h-6 shrink-0" />
            <span className="text-[10px] font-semibold tracking-wide">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
