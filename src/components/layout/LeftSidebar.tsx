'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Home, Users, Bell, Settings, Bookmark, Calendar } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function LeftSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col gap-1 w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-2">
      {session?.user && (
        <Link
          href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Avatar src={session.user.image} name={session.user.name} size="md" />
          <span className="font-semibold text-sm">{session.user.name}</span>
        </Link>
      )}
      <div className="border-t border-gray-200 my-1" />
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl transition-colors text-sm font-medium',
            pathname === href
              ? 'bg-blue-50 text-blue-600'
              : 'hover:bg-gray-100 text-gray-700'
          )}
        >
          <Icon className="w-5 h-5" />
          {label}
        </Link>
      ))}
    </aside>
  )
}
