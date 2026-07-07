import { auth } from '@/lib/auth'

export const ROLES = ['admin', 'coach', 'member'] as const
export type Role = (typeof ROLES)[number]

// Roles that get free access (never paywalled once billing is on).
export const FREE_ROLES: Role[] = ['admin', 'coach']

/**
 * Returns the current session if the user is an admin, otherwise null.
 * Use in admin API routes: `const session = await requireAdmin(); if (!session) return 401/403`.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== 'admin') return null
  return session
}

/** Session if the user is staff (coach or admin), else null. */
export async function requireStaff() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== 'admin' && session.user.role !== 'coach') return null
  return session
}
