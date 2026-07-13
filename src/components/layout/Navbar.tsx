'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Home, Users, LogOut, Settings, User, ChevronDown, CheckCheck, Sun, Moon } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { useTheme } from '@/components/ThemeProvider'
import { useMyProfile } from '@/lib/useMyProfile'

function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      className="p-2 hover:bg-elevated rounded-lg text-ink2 hover:text-yellow-500 transition-colors"
    >
      {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

interface Notification {
  id: string; type: string; message: string; read: boolean; link: string | null; createdAt: string
  sender: { id: string; name: string | null; image: string | null } | null
}

const notifIcons: Record<string, string> = {
  like: '👍', comment: '💬', friend_request: '👥', friend_accept: '🤝', follow: '📈', post_tag: '🏷️',
}

export function Navbar() {
  const { data: session } = useSession()
  const me = useMyProfile({ image: session?.user?.image, name: session?.user?.name })
  const router = useRouter()

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)

  const [showUserMenu, setShowUserMenu] = useState(false)

  const notifsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!session?.user?.id || (typeof document !== 'undefined' && document.hidden)) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const d = await res.json()
      setUnreadCount(d.unreadCount ?? 0)
      setNotifications(d.notifications ?? [])
    } catch {
      // silently ignore — network blip
    }
  }, [session?.user?.id])

  // Initial load + poll every 30 s
  useEffect(() => {
    fetchNotifs()
    const id = setInterval(fetchNotifs, 45_000)
    return () => clearInterval(id)
  }, [fetchNotifs])

  // ── Mark all read ────────────────────────────────────────────────────────
  async function markAllRead() {
    if (unreadCount === 0 || markingRead) return
    setMarkingRead(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } finally {
      setMarkingRead(false)
    }
  }

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleNotifClick(notif: Notification) {
    // mark this one read locally
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    setUnreadCount(prev => notif.read ? prev : Math.max(0, prev - 1))
    setShowNotifs(false)
    if (notif.link) router.push(notif.link)
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-sunken/95 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
          <img src="/logo.png" alt="Gold Heist Trading" className="w-9 h-9 object-contain" />
          <span className="hidden sm:block truncate text-sm font-bold tracking-wide text-ink">
            GOLD HEIST<span className="text-yellow-500"> TRADING</span>
          </span>
        </Link>

        {/* Right nav icons */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Feed + Traders — hidden on mobile (available in the bottom nav) */}
          <Link href="/feed" className="hidden sm:block p-2 hover:bg-elevated rounded-lg text-ink2 hover:text-yellow-500 transition-colors">
            <Home className="w-5 h-5" />
          </Link>
          <Link href="/friends" className="hidden sm:block p-2 hover:bg-elevated rounded-lg text-ink2 hover:text-yellow-500 transition-colors">
            <Users className="w-5 h-5" />
          </Link>

          {/* Light / dark toggle */}
          <ThemeToggle />

          {/* Notification bell with dropdown */}
          <div ref={notifsRef} className="relative">
            <button
              onClick={() => { setShowNotifs(o => !o); if (!showNotifs) markAllRead() }}
              className="relative p-2 hover:bg-elevated rounded-lg text-ink2 hover:text-yellow-500 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] rounded-full flex items-center justify-center font-black leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-xl shadow-2xl border border-line overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <span className="font-bold text-sm text-ink">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors">
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                    <Link href="/notifications" onClick={() => setShowNotifs(false)} className="text-[10px] text-ink3 hover:text-yellow-500 transition-colors">
                      See all
                    </Link>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-line">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 text-line mx-auto mb-2" />
                      <p className="text-xs text-ink3">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-elevated w-full text-left transition-colors ${!notif.read ? 'bg-yellow-500/5' : ''}`}
                      >
                        <div className="relative shrink-0">
                          <Avatar src={notif.sender?.image} name={notif.sender?.name} size="sm" />
                          <span className="absolute -bottom-0.5 -right-0.5 text-xs">{notifIcons[notif.type] || '🔔'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink leading-snug">{notif.message}</p>
                          <p className="text-[10px] text-ink3 mt-0.5">{timeAgo(notif.createdAt)}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          {session?.user && (
            <div ref={userMenuRef} className="relative ml-1">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 hover:bg-elevated rounded-lg transition-colors"
              >
                <Avatar src={me.image} name={me.name || session.user.name} size="sm" />
                <ChevronDown className="w-3 h-3 text-ink3" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl shadow-2xl border border-line overflow-hidden z-50">
                  <div className="p-3 border-b border-line">
                    <p className="font-semibold text-sm text-ink truncate">{session.user.name}</p>
                    <p className="text-xs text-ink3 truncate">{session.user.email}</p>
                  </div>
                  <Link href={`/profile/${session.user.id}`} onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 p-3 hover:bg-elevated text-sm text-ink2 hover:text-ink transition-colors">
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <Link href="/settings" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 p-3 hover:bg-elevated text-sm text-ink2 hover:text-ink transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 p-3 hover:bg-elevated text-sm text-red-400 hover:text-red-300 w-full text-left transition-colors border-t border-line">
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
