'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, LineChart, Lightbulb, CalendarDays, NotebookPen } from 'lucide-react'

const items = [
  { href: '/',         label: 'Feed',     icon: Home         },
  { href: '/chart',    label: 'Chart',    icon: LineChart    },
  { href: '/ideas',    label: 'Ideas',    icon: Lightbulb    },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/journal',  label: 'Journal',  icon: NotebookPen  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-sunken/95 backdrop-blur-md border-t border-line"
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
      </div>
    </nav>
  )
}
