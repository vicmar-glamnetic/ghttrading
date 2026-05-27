'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, TrendingUp, BookOpen, Bell, Settings, Users, Zap, BarChart2, Globe } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/signals', label: 'Signals', icon: Zap },
  { href: '/analysis', label: 'Analysis', icon: BarChart2 },
  { href: '/education', label: 'Education', icon: BookOpen },
  { href: '/friends', label: 'Traders', icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const categories = [
  { label: 'XAUUSD', color: 'text-yellow-500', dot: 'bg-yellow-500' },
  { label: 'XAGUSD', color: 'text-gray-400', dot: 'bg-gray-400' },
  { label: 'Forex', color: 'text-blue-400', dot: 'bg-blue-400' },
  { label: 'Crypto', color: 'text-purple-400', dot: 'bg-purple-400' },
  { label: 'Stocks', color: 'text-green-400', dot: 'bg-green-400' },
]

export function LeftSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col gap-1 w-56 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-4">
      {session?.user && (
        <Link href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2c] transition-colors mb-2 border border-[#2a2a3a] bg-[#16161f]">
          <Avatar src={session.user.image} name={session.user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f8] truncate">{session.user.name}</p>
            <p className="text-xs text-yellow-500 truncate">@{(session.user as {username?: string}).username}</p>
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

      <div className="mt-4 px-3">
        <p className="text-xs font-bold text-[#5a5a72] uppercase tracking-wider mb-2">Markets</p>
        <div className="space-y-1">
          {categories.map(cat => (
            <button key={cat.label}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-[#1e1e2c] transition-colors text-left">
              <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
              <span className={`text-sm ${cat.color}`}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 mx-3 p-3 rounded-xl bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">JOIN DISCORD</span>
        </div>
        <p className="text-xs text-[#9090a8]">Live trading sessions Mon-Fri</p>
        <a href="https://discord.gg" target="_blank" rel="noopener noreferrer"
          className="mt-2 block text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1.5 rounded-lg transition-colors">
          Join Now
        </a>
      </div>

      <p className="text-xs text-[#5a5a72] px-3 mt-4">© 2026 GHT Trading</p>
    </aside>
  )
}
