'use client'
import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs text-ink3 hover:text-ink transition-colors"
    >
      Log out
    </button>
  )
}
