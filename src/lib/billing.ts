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
  gcashName: process.env.NEXT_PUBLIC_GCASH_NAME || 'Gold Heist Trading',
  gcashNumber: process.env.NEXT_PUBLIC_GCASH_NUMBER || '0917 000 0000',
  mayaNumber: process.env.NEXT_PUBLIC_MAYA_NUMBER || '',
  // Where members send proof of payment (e.g. a Messenger/Telegram/email).
  proofContact: process.env.NEXT_PUBLIC_PAYMENT_PROOF_CONTACT || 'our support chat',
}

// Crypto (USDT) payment — send-to-wallet, then admin activates. Override the
// address/network via env if needed.
export const CRYPTO = {
  address: process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x1f6e0dfba04dae1eee5f6be1cd1ac20e4923ba10',
  network: process.env.NEXT_PUBLIC_USDT_NETWORK || 'BEP20 (BSC)',
  get enabled() {
    return Boolean(this.address)
  },
}

// Our AC Capital Market partner link. Registering under it makes a user an ACCM
// member, which means the community is free for them.
export const ACCM_REGISTER_URL =
  process.env.NEXT_PUBLIC_ACCM_REGISTER_URL ||
  'https://accm.global/account/register?shareUserSetId=55d80c5becfd46ccb'

// PayPal subscription config (client-safe values).
export const PAYPAL = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  planId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '',            // $5 standard
  planIdAccm: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ACCM || '',   // $1.99 ACCM
}

// PayMongo (GCash / Maya) — one-time monthly payment via a hosted checkout.
// E-wallets can't auto-recur, so each paid checkout grants ACCESS_DAYS of access
// and the member re-pays next month. Secret key + webhook secret are server-only.
//   PAYMONGO_SECRET_KEY    (sk_test_… / sk_live_…)
//   PAYMONGO_WEBHOOK_SECRET (whsk_…, from the webhook you register)
// NEXT_PUBLIC_PAYMONGO_ENABLED=true turns the button on in the UI.
export const PAYMONGO = {
  enabled: process.env.NEXT_PUBLIC_PAYMONGO_ENABLED === 'true',
  accessDays: Number(process.env.PAYMONGO_ACCESS_DAYS) || 30,
}

/** Whether PayMongo is wired up (server-side check). */
export function paymongoConfigured() {
  return Boolean(process.env.PAYMONGO_SECRET_KEY)
}

/**
 * Pricing tier. ACCM members are free; other-broker members pay the standard
 * $5/mo (after their trial).
 */
export function tierFor(accmMember: boolean | null | undefined) {
  return accmMember !== false
    ? { usd: 0, planId: '', label: 'ACCM' as const, free: true }
    : { usd: BILLING.priceUsd, planId: PAYPAL.planId, label: 'Standard' as const, free: false }
}

const DAY = 24 * 60 * 60 * 1000
/** Days left in a trial (0 if none/expired). */
export function trialDaysLeft(trialEndsAt: string | Date | null | undefined) {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / DAY) : 0
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
export const PREMIUM_PATHS = ['/trading', '/live', '/anti-hacking', '/education', '/courses', '/journal', '/calendar']

export function isPremiumPath(pathname: string) {
  return PREMIUM_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Roles and subscription states that always have access.
const FREE_ROLES = ['admin', 'coach']
const ACTIVE_STATUSES = ['active', 'comp']

/**
 * Whether a user can access premium sections.
 * ACCM members: free. Other brokers: free during their trial, then need $5.
 */
export function hasAccess(user: {
  role?: string | null
  subscriptionStatus?: string | null
  accmMember?: boolean | null
  trialEndsAt?: string | Date | null
}) {
  if (!PAYWALL_ENABLED) return true
  if (user.role && FREE_ROLES.includes(user.role)) return true
  if (user.accmMember) return true // ACCM members are free
  if (user.subscriptionStatus && ACTIVE_STATUSES.includes(user.subscriptionStatus)) return true
  // Other-broker members get a free trial window.
  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) return true
  return false
}
