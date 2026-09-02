/**
 * The brokers we accept clients from.
 *
 * Two of them — ACCM and VT Markets — are partner brokers: we earn on their
 * volume, so the community is free for their clients and they prove the account
 * with a number + screenshot (see lib/identity). Anyone else is "other": a
 * 3-day trial, then $5/mo, and nothing to prove.
 *
 * The stored `broker` column is the source of truth for WHICH broker; the older
 * `accmMember` boolean is kept in step with it (true for either partner) so all
 * the billing and gating that already keys off it keeps working untouched.
 *
 * Keep this file free of server-only imports — the register form, the identity
 * gate and the API routes all read the same registry.
 */

export type BrokerId = 'accm' | 'vtmarkets' | 'other'

export interface Broker {
  id: BrokerId
  /** Short name used in member-facing copy: "your ACCM account number". */
  label: string
  /** Legal/full name, for the odd place that wants to spell it out. */
  full: string
  /** Free access + account verification, or trial-then-paid. */
  partner: boolean
  /** Our IB link, so a member without an account can open one. Partners only. */
  registerUrl: string
  /** One-liner under the option on the register form. */
  blurb: string
}

// Our AC Capital Market partner link. Registering under it makes a user an ACCM
// member, which means the community is free for them.
const ACCM_URL =
  process.env.NEXT_PUBLIC_ACCM_REGISTER_URL ||
  'https://accm.global/account/register?shareUserSetId=55d80c5becfd46ccb'

// Same deal for VT Markets. Set NEXT_PUBLIC_VT_REGISTER_URL to your own IB link
// — the fallback is VT's plain sign-up page and earns us nothing.
const VT_URL =
  process.env.NEXT_PUBLIC_VT_REGISTER_URL ||
  'https://www.vtmarkets.com/register/'

export const BROKERS: readonly Broker[] = [
  { id: 'accm', label: 'ACCM', full: 'AC Capital Market', partner: true, registerUrl: ACCM_URL, blurb: 'Free access' },
  { id: 'vtmarkets', label: 'VT Markets', full: 'VT Markets', partner: true, registerUrl: VT_URL, blurb: 'Free access' },
  { id: 'other', label: 'Other broker', full: 'another broker', partner: false, registerUrl: '', blurb: '3-day free trial' },
] as const

/** Every broker whose clients get in free. */
export const PARTNER_BROKERS = BROKERS.filter(b => b.partner)

const DEFAULT: BrokerId = 'accm'

/**
 * Coerce anything (a request body, a legacy null column) to a known broker.
 * Unknown values fall back to ACCM, which is what every pre-VT row is.
 */
export function normalizeBroker(raw: unknown): BrokerId {
  const v = String(raw ?? '').trim().toLowerCase().replace(/[\s_-]/g, '')
  if (v === 'vtmarkets' || v === 'vt') return 'vtmarkets'
  if (v === 'accm') return 'accm'
  if (v === 'other') return 'other'
  return DEFAULT
}

export function brokerOf(raw: unknown): Broker {
  const id = normalizeBroker(raw)
  return BROKERS.find(b => b.id === id) ?? BROKERS[0]
}

/** "ACCM" / "VT Markets" — drop straight into member-facing copy. */
export function brokerLabel(raw: unknown): string {
  return brokerOf(raw).label
}

/** Our IB link for this broker ('' for "other"). */
export function brokerRegisterUrl(raw: unknown): string {
  return brokerOf(raw).registerUrl
}

/** Free access + account verification? (i.e. the old `accmMember === true`). */
export function isPartnerBroker(raw: unknown): boolean {
  return brokerOf(raw).partner
}

/**
 * Best guess at the broker for a row written before this column existed, so
 * anything reading a stale payload still shows something sensible.
 */
export function brokerFrom(u: { broker?: string | null; accmMember?: boolean | null }): BrokerId {
  if (u.broker) return normalizeBroker(u.broker)
  return u.accmMember === false ? 'other' : 'accm'
}
