'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  Home, LineChart, Lightbulb, CalendarDays, NotebookPen, Menu, X,
  CandlestickChart, BarChart2, Radio, BookOpen, Users, Bell, Settings,
  Shield, User, LogOut,
} from 'lucide-react'

const items = [
  { href: '/',         label: 'Feed',    icon: Home         },
  { href: '/chart',    label: 'Chart',   icon: LineChart    },
  { href: '/ideas',    label: 'Ideas',   icon: Lightbulb    },
  { href: '/journal',  label: 'Journal', icon: NotebookPen  },
]

// Full navigation shown in the "More" sheet.
const allNav = [
  { href: '/',              label: 'Feed',          icon: Home            },
  { href: '/chart',         label: 'Trading View',  icon: LineChart       },
  { href: '/trading',       label: 'Trading',       icon: CandlestickChart },
  { href: '/ideas',         label: 'Trade Ideas',   icon: Lightbulb       },
  { href: '/analysis',      label: 'Analysis',      icon: BarChart2       },
  { href: '/live',          label: 'Live',          icon: Radio           },
  { href: '/education',     label: 'Education',     icon: BookOpen        },
  { href: '/friends',       label: 'Traders',       icon: Users           },
  { href: '/journal',       label: 'My Journal',    icon: NotebookPen     },
  { href: '/calendar',      label: 'Calendar',      icon: CalendarDays    },
  { href: '/notifications', label: 'Notifications', icon: Bell            },
  { href: '/settings',      label: 'Settings',      icon: Settings        },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const menu = [...allNav]
  if (session?.user?.id) menu.push({ href: `/profile/${session.user.id}`, label: 'Profile', icon: User })
  if (session?.user?.role === 'admin') menu.push({ href: '/admin', label: 'Admin', icon: Shield })

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
              {menu.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href + label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-colors',
                      active
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                        : 'border-line bg-surface text-ink2 active:bg-elevated'
                    )}
                  >
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
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors',
                  active ? 'text-yellow-500' : 'text-ink3 active:text-ink2'
                )}
              >
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
