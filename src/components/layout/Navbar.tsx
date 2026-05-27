'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Search, Home, Users, LogOut, Settings, User } from 'lucide-react'

interface SearchUser {
  id: string
  name: string | null
  image: string | null
  username: string | null
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 mr-2">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="font-bold text-blue-600 text-lg hidden sm:block">GHT Community</span>
        </Link>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xs">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="bg-transparent text-sm outline-none w-full"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => { router.push(`/profile/${user.id}`); setShowSearch(false); setSearchQuery('') }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left"
                >
                  <Avatar src={user.image} name={user.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav Icons */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Home className="w-6 h-6" />
          </Link>
          <Link href="/friends" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Users className="w-6 h-6" />
          </Link>
          <Link href="/notifications" className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {session?.user && (
            <div ref={userMenuRef} className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="rounded-full">
                <Avatar src={session.user.image} name={session.user.name} size="sm" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-semibold text-sm">{session.user.name}</p>
                    <p className="text-xs text-gray-500">{session.user.email}</p>
                  </div>
                  <Link href={`/profile/${session.user.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 text-sm">
                    <User className="w-4 h-4" /> View Profile
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 p-3 hover:bg-gray-50 text-sm">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 text-sm text-red-600 w-full text-left"
                  >
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
