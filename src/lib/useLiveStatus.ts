'use client'
import { useEffect, useState } from 'react'

// Polls the live-webinar state so the nav can surface a "LIVE now" indicator
// whenever a coach is streaming. Pauses while the tab is hidden.
export function useLiveStatus(pollMs = 30_000) {
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    let alive = true
    const poll = () => {
      if (document.hidden) return
      fetch('/api/live')
        .then(r => r.json())
        .then(d => { if (alive) setIsLive(Boolean(d?.webinar?.isLive)) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, pollMs)
    document.addEventListener('visibilitychange', poll)
    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [pollMs])

  return isLive
}
