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

/**
 * Roles a coach may hand out. Never includes 'admin' — a coach who could grant
 * admin could promote an alt account and escalate to full admin.
 */
export const COACH_ASSIGNABLE_ROLES: Role[] = ['coach', 'member']

/**
 * Can `actorRole` edit/delete a user whose role is `targetRole`?
 * Coaches manage coaches and members; admin accounts are off-limits to them,
 * so a coach can't deactivate or delete the admins above them.
 */
export function canManageRole(actorRole: string | null | undefined, targetRole: string) {
  if (actorRole === 'admin') return true
  if (actorRole === 'coach') return targetRole !== 'admin'
  return false
}
