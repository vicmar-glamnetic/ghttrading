// Membership / billing config for the manual GCash-Maya flow.
//
// Turn the paywall ON by setting PAYWALL_ENABLED=true in the environment
// (Vercel → Project → Settings → Environment Variables). While it's off,
// everyone keeps full access — existing members are never locked out.
export const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED === 'true'

// Payment instructions shown on /upgrade. Override via env in production.
export const BILLING = {
  priceUsd: process.env.NEXT_PUBLIC_PRICE_USD || '5',
  pricePhp: process.env.NEXT_PUBLIC_PRICE_PHP || '290',
  gcashName: process.env.NEXT_PUBLIC_GCASH_NAME || 'GHT Trading',
  gcashNumber: process.env.NEXT_PUBLIC_GCASH_NUMBER || '0917 000 0000',
  mayaNumber: process.env.NEXT_PUBLIC_MAYA_NUMBER || '',
  // Where members send proof of payment (e.g. a Messenger/Telegram/email).
  proofContact: process.env.NEXT_PUBLIC_PAYMENT_PROOF_CONTACT || 'our support chat',
}

// Roles and subscription states that always have access.
const FREE_ROLES = ['admin', 'coach']
const ACTIVE_STATUSES = ['active', 'comp']

/** Whether a user can access the members' area. */
export function hasAccess(user: { role?: string | null; subscriptionStatus?: string | null }) {
  if (!PAYWALL_ENABLED) return true
  if (user.role && FREE_ROLES.includes(user.role)) return true
  return !!user.subscriptionStatus && ACTIVE_STATUSES.includes(user.subscriptionStatus)
}
