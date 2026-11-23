'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OnlineAvatar } from '@/components/ui/OnlineAvatar'
import { HEARTBEAT_MS } from '@/lib/presence'
import { PanelSection } from '@/components/layout/PanelSection'

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
    <PanelSection
      label="Online now"
      meta={
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> {total}
        </span>
      }
    >
      <div className="max-h-56 overflow-y-auto scrollbar-none pb-2">
        {users.map(u => (
          <Link
            key={u.id}
            href={`/profile/${u.id}`}
            className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-elevated transition-colors"
          >
            <OnlineAvatar src={u.image} name={u.name} size="xs" lastSeenAt={u.lastSeenAt} />
            <span className="min-w-0 truncate text-xs font-medium text-ink">{u.name || 'Unnamed'}</span>
            {u.role !== 'member' && (
              <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wide text-yellow-500">{u.role}</span>
            )}
          </Link>
        ))}
        {total > users.length && (
          <p className="px-4 pt-1 text-[10px] text-ink3">+{total - users.length} more</p>
        )}
      </div>
    </PanelSection>
  )
}
