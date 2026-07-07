// Membership / billing config for the manual GCash-Maya flow.
//
// Turn the paywall ON by setting PAYWALL_ENABLED=true in the environment
// (Vercel → Project → Settings → Environment Variables). While it's off,
// everyone keeps full access — existing members are never locked out.
export const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED === 'true'

// Two price tiers. Everyone is an ACCM member ($1.99) by default; admins can
// switch a user to the standard ($5) tier.
export const BILLING = {
  priceUsd: Number(process.env.NEXT_PUBLIC_PRICE_USD) || 5,          // standard / non-ACCM
  priceUsdAccm: Number(process.env.NEXT_PUBLIC_PRICE_USD_ACCM) || 1.99, // ACCM
  // Fallback USD→PHP rate used only if the live rate can't be fetched.
  fallbackRate: Number(process.env.USD_PHP_FALLBACK_RATE) || 58,
  gcashName: process.env.NEXT_PUBLIC_GCASH_NAME || 'GHT Trading',
  gcashNumber: process.env.NEXT_PUBLIC_GCASH_NUMBER || '0917 000 0000',
  mayaNumber: process.env.NEXT_PUBLIC_MAYA_NUMBER || '',
  // Where members send proof of payment (e.g. a Messenger/Telegram/email).
  proofContact: process.env.NEXT_PUBLIC_PAYMENT_PROOF_CONTACT || 'our support chat',
}

// PayPal subscription config (client-safe values).
export const PAYPAL = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  planId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '',            // $5 standard
  planIdAccm: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ACCM || '',   // $1.99 ACCM
}

/** Resolve the price + PayPal plan for a user based on their ACCM status. */
export function tierFor(accmMember: boolean | null | undefined) {
  return accmMember !== false
    ? { usd: BILLING.priceUsdAccm, planId: PAYPAL.planIdAccm, label: 'ACCM' as const }
    : { usd: BILLING.priceUsd, planId: PAYPAL.planId, label: 'Standard' as const }
}

/** Whether PayPal is usable for a given plan id. */
export function canSubscribe(planId: string) {
  return Boolean(PAYPAL.clientId && planId)
}

/**
 * Convert a USD price to pesos at the current rate (cached ~6h).
 * Falls back to BILLING.fallbackRate if the FX API is unavailable.
 */
export async function getPricePhp(usd: number): Promise<{ php: number; live: boolean }> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 }, // 6 hours
    })
    const data = await res.json()
    const rate = data?.rates?.PHP
    if (typeof rate === 'number' && rate > 0) {
      return { php: Math.round(usd * rate), live: true }
    }
  } catch {
    // fall through to fallback
  }
  return { php: Math.round(usd * BILLING.fallbackRate), live: false }
}

// Premium (paid) sections. Everything else is free. When the paywall is on,
// members without an active subscription are redirected to /upgrade for these.
export const PREMIUM_PATHS = ['/trading', '/live', '/anti-hacking', '/study', '/education', '/journal', '/calendar']

export function isPremiumPath(pathname: string) {
  return PREMIUM_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Roles and subscription states that always have access.
const FREE_ROLES = ['admin', 'coach']
const ACTIVE_STATUSES = ['active', 'comp']

/** Whether a user can access premium sections. */
export function hasAccess(user: { role?: string | null; subscriptionStatus?: string | null }) {
  if (!PAYWALL_ENABLED) return true
  if (user.role && FREE_ROLES.includes(user.role)) return true
  return !!user.subscriptionStatus && ACTIVE_STATUSES.includes(user.subscriptionStatus)
}
