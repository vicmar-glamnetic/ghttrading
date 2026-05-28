'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Users, Flag, UsersRound, NotebookPen } from 'lucide-react'

const items = [
  { href: '/',        label: 'Feed',    icon: Home        },
  { href: '/friends', label: 'Traders', icon: Users       },
  { href: '/groups',  label: 'Groups',  icon: UsersRound  },
  { href: '/pages',   label: 'Pages',   icon: Flag        },
  { href: '/journal', label: 'Journal', icon: NotebookPen },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0d0d14]/95 backdrop-blur-md border-t border-[#2a2a3a] safe-area-pb">
      <div className="flex items-center justify-around h-14 px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors',
                active ? 'text-yellow-500' : 'text-[#5a5a72] hover:text-[#9090a8]'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
