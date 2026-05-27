'use client'
import { useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

/**
 * Watches the session for a SessionInvalid error (set when another device
 * logs into the same account). When detected, signs out immediately.
 * Also periodically refreshes the session so the check stays live.
 */
export function SessionGuard() {
  const { data: session, update } = useSession()

  // If the server flagged this session as invalid, sign out right away
  useEffect(() => {
    if ((session as { error?: string })?.error === 'SessionInvalid') {
      signOut({ callbackUrl: '/login?reason=session_replaced' })
    }
  }, [session])

  // Re-validate against the DB every 5 minutes by triggering a session update
  useEffect(() => {
    const id = setInterval(() => {
      update()
    }, 5 * 60 * 1000)   // 5 minutes
    return () => clearInterval(id)
  }, [update])

  return null
}
