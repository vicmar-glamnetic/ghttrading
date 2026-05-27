'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import { Bell } from 'lucide-react'
import type { NotificationWithSender } from '@/types'

const notifIcons: Record<string, string> = {
  like: '👍',
  comment: '💬',
  friend_request: '👥',
  friend_accept: '🤝',
  follow: '👤',
  post_tag: '🏷️',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithSender[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || [])
        setLoading(false)
        // Mark all as read
        fetch('/api/notifications', { method: 'PATCH' })
      })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-gray-200 rounded" />
                <div className="h-2 w-1/4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {notifications.map(notif => (
            <Link
              key={notif.id}
              href={notif.link || '/'}
              className={`flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50' : ''}`}
            >
              <div className="relative">
                <Avatar src={notif.sender?.image} name={notif.sender?.name} size="md" />
                <span className="absolute -bottom-1 -right-1 text-base">{notifIcons[notif.type] || '🔔'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-0.5">{timeAgo(notif.createdAt)}</p>
              </div>
              {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
