'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Search, Home, Users, TrendingUp, LogOut, Settings, User, ChevronDown, BarChart2 } from 'lucide-react'

interface SearchUser {
  id: string; name: string | null; image: string | null; username: string | null
}

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session?.user) {
      fetch('/api/notifications').then(r => r.json()).then(d => {
        if (d.unreadCount !== undefined) setUnreadCount(d.unreadCount)
      }).catch(() => {})
    }
  }, [session])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
        setShowSearch(true)
      } else {
        setSearchResults([])
        setShowSearch(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2a3a] bg-[#0d0d14]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <span className="text-black font-black text-sm">G</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-white text-sm tracking-tight">GHT</span>
            <span className="font-light text-yellow-500 text-sm ml-1">Trading</span>
          </div>
        </Link>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-[#16161f] border border-[#2a2a3a] rounded-lg px-3 py-2 focus-within:border-yellow-500/50 transition-colors">
            <Search className="w-4 h-4 text-[#5a5a72] shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search traders..."
              className="bg-transparent text-sm outline-none w-full text-[#f0f0f8] placeholder-[#5a5a72]"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-[#16161f] rounded-xl shadow-2xl border border-[#2a2a3a] overflow-hidden z-50">
              {searchResults.map(user => (
                <button key={user.id} onClick={() => { router.push(`/profile/${user.id}`); setShowSearch(false); setSearchQuery('') }}
                  className="flex items-center gap-3 p-3 hover:bg-[#1e1e2c] w-full text-left transition-colors">
                  <Avatar src={user.image} name={user.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-[#f0f0f8]">{user.name}</p>
                    <p className="text-xs text-[#5a5a72]">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href="/" className="p-2 hover:bg-[#1e1e2c] rounded-lg text-[#9090a8] hover:text-yellow-500 transition-colors">
            <Home className="w-5 h-5" />
          </Link>
          <Link href="/friends" className="p-2 hover:bg-[#1e1e2c] rounded-lg text-[#9090a8] hover:text-yellow-500 transition-colors">
            <Users className="w-5 h-5" />
          </Link>
          <Link href="/signals" className="p-2 hover:bg-[#1e1e2c] rounded-lg text-[#9090a8] hover:text-yellow-500 transition-colors">
            <TrendingUp className="w-5 h-5" />
          </Link>
          <Link href="/notifications" className="relative p-2 hover:bg-[#1e1e2c] rounded-lg text-[#9090a8] hover:text-yellow-500 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 text-black text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {session?.user && (
            <div ref={userMenuRef} className="relative ml-1">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 hover:bg-[#1e1e2c] rounded-lg transition-colors">
                <Avatar src={session.user.image} name={session.user.name} size="sm" />
                <ChevronDown className="w-3 h-3 text-[#5a5a72]" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-[#16161f] rounded-xl shadow-2xl border border-[#2a2a3a] overflow-hidden z-50">
                  <div className="p-3 border-b border-[#2a2a3a]">
                    <p className="font-semibold text-sm text-[#f0f0f8]">{session.user.name}</p>
                    <p className="text-xs text-[#5a5a72]">{session.user.email}</p>
                  </div>
                  <Link href={`/profile/${session.user.id}`} className="flex items-center gap-3 p-3 hover:bg-[#1e1e2c] text-sm text-[#9090a8] hover:text-[#f0f0f8] transition-colors">
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 p-3 hover:bg-[#1e1e2c] text-sm text-[#9090a8] hover:text-[#f0f0f8] transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 p-3 hover:bg-[#1e1e2c] text-sm text-red-400 hover:text-red-300 w-full text-left transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
