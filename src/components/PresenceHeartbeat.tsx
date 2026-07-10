'use client'
import { useEffect } from 'react'
import { HEARTBEAT_MS } from '@/lib/presence'

/**
 * Tells the server this member is on the site, so admins get a live online dot.
 *
 * Only beats while the tab is visible — a tab left open overnight would
 * otherwise keep someone "online" long after they walked away. Coming back to a
 * backgrounded tab beats immediately rather than waiting out the interval.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState !== 'visible') return
      // A missed beat self-heals on the next one; nothing to report to the user.
      fetch('/api/presence', { method: 'POST' }).catch(() => {})
    }

    beat()
    const id = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [])

  return null
}
