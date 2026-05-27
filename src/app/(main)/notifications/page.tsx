'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import { Bell } from 'lucide-react'
import type { NotificationWithSender } from '@/types'

const notifIcons: Record<string, string> = {
  like: '👍', comment: '💬', friend_request: '👥', friend_accept: '🤝', follow: '📈', post_tag: '🏷️',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithSender[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      setNotifications(d.notifications || [])
      setLoading(false)
      fetch('/api/notifications', { method: 'PATCH' })
    })
  }, [])

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a3a]">
        <Bell className="w-5 h-5 text-yellow-500" />
        <h1 className="text-lg font-bold text-[#f0f0f8]">Notifications</h1>
      </div>
      {loading ? (
        <div className="p-8 space-y-4 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2a2a3a]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-[#2a2a3a] rounded" />
                <div className="h-2 w-1/4 bg-[#2a2a3a] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center">
          <Bell className="w-12 h-12 text-[#2a2a3a] mx-auto mb-3" />
          <p className="text-[#5a5a72] text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#2a2a3a]">
          {notifications.map(notif => (
            <Link key={notif.id} href={notif.link || '/'}
              className={`flex items-start gap-3 p-4 hover:bg-[#1e1e2c] transition-colors ${!notif.read ? 'bg-yellow-500/5' : ''}`}>
              <div className="relative shrink-0">
                <Avatar src={notif.sender?.image} name={notif.sender?.name} size="md" />
                <span className="absolute -bottom-1 -right-1 text-sm">{notifIcons[notif.type] || '🔔'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#e0e0f0]">{notif.message}</p>
                <p className="text-xs text-[#5a5a72] mt-0.5">{timeAgo(notif.createdAt)}</p>
              </div>
              {!notif.read && <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
