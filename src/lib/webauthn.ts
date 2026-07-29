import { cookies } from 'next/headers'

/**
 * WebAuthn (passkey) server helpers — Face ID / Touch ID / Windows Hello sign-in.
 *
 * Passkeys are strictly stronger than the password they replace: the private key
 * never leaves the device's secure enclave, it is bound to our domain (so a
 * lookalike phishing site can't use it), and there is no shared secret for us to
 * leak. The biometric itself never reaches our servers — the device only tells
 * us "the owner is present".
 */

const CHALLENGE_COOKIE = 'ght-webauthn-challenge'
const CHALLENGE_TTL_S = 5 * 60

export interface RelyingParty { id: string; name: string; origin: string }

/**
 * Relying-party identity. rpID is the bare domain and MUST match the site the
 * member is on, or the browser refuses the credential — that domain binding is
 * exactly what makes passkeys unphishable.
 */
export function relyingParty(): RelyingParty {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  const url = new URL(raw)
  return { id: url.hostname, name: 'Gold Heist Trading', origin: url.origin }
}

/**
 * Stash the challenge in an httpOnly cookie between "options" and "verify".
 * A cookie (rather than a DB row) keeps it naturally bound to the one browser
 * that asked for it, and it expires on its own if the member walks away.
 */
export async function setChallenge(challenge: string) {
  const jar = await cookies()
  jar.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_TTL_S,
  })
}

export async function readChallenge(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(CHALLENGE_COOKIE)?.value ?? null
}

/** Always clear after a verify attempt — a challenge is single-use, pass or fail. */
export async function clearChallenge() {
  const jar = await cookies()
  jar.delete(CHALLENGE_COOKIE)
}

/**
 * Best-effort friendly label for the device, from its user-agent. Members will
 * see this in Settings when deciding which passkey to remove, so "iPhone" beats
 * a raw credential ID.
 */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? ''
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Android/i.test(ua)) return 'Android device'
  if (/Windows/i.test(ua)) return 'Windows PC'
  return 'This device'
}
