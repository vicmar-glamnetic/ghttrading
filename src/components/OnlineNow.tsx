'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { OnlineAvatar } from '@/components/ui/OnlineAvatar'
import { HEARTBEAT_MS } from '@/lib/presence'
import { CARD_H } from '@/components/layout/RightSidebar'

interface OnlineUser {
  id: string
  name: string | null
  username: string | null
  image: string | null
  role: string
  lastSeenAt: string
}

/**
 * "Online now" roster. Repolls on the heartbeat cadence so it tracks people
 * arriving and leaving without a page refresh.
 */
export function OnlineNow() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/presence')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
      } catch {
        // transient — the next poll retries
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    const id = setInterval(load, HEARTBEAT_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Don't flash an empty card before the first response lands.
  if (!loaded || total === 0) return null

  return (
    <div className={`bg-surface rounded-xl border border-line overflow-hidden flex flex-col ${CARD_H}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line shrink-0">
        <Users className="w-4 h-4 text-green-400" />
        <span className="text-sm font-bold text-ink">Online now</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {total}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-2 space-y-0.5">
        {users.map(u => (
          <Link
            key={u.id}
            href={`/profile/${u.id}`}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-elevated transition-colors"
          >
            <OnlineAvatar src={u.image} name={u.name} size="xs" lastSeenAt={u.lastSeenAt} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
              {u.username && <p className="text-[10px] text-ink3 truncate">@{u.username}</p>}
            </div>
            {u.role !== 'member' && (
              <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-yellow-500 shrink-0">
                {u.role}
              </span>
            )}
          </Link>
        ))}
        {total > users.length && (
          <p className="px-1.5 pt-1 text-[10px] text-ink3">+{total - users.length} more online</p>
        )}
      </div>
    </div>
  )
}
