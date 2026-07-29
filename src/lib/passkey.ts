'use client'
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import { signIn } from 'next-auth/react'

/**
 * Client half of passkey (Face ID / Touch ID / Windows Hello) sign-in.
 * The server half lives in /api/auth/passkey/* and src/lib/webauthn.ts.
 */

/** Can this device do biometric sign-in at all? Async — it probes the platform. */
export async function biometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !browserSupportsWebAuthn()) return false
  try {
    return await platformAuthenticatorIsAvailable()
  } catch {
    return false
  }
}

/** True when the member cancelled the Face ID sheet — not worth an error message. */
function isCancel(err: unknown): boolean {
  const name = (err as { name?: string })?.name
  return name === 'NotAllowedError' || name === 'AbortError'
}

export type PasskeyResult =
  | { ok: true; name?: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: string }

/** Enrol this device. The member must already be signed in. */
export async function registerPasskey(): Promise<PasskeyResult> {
  try {
    const optRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' })
    if (!optRes.ok) throw new Error('Could not start setup. Please try again.')
    const options = await optRes.json()

    const attestation = await startRegistration(options)

    const verifyRes = await fetch('/api/auth/passkey/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attestation),
    })
    const data = await verifyRes.json().catch(() => null)
    if (!verifyRes.ok) throw new Error(data?.error || 'Could not finish setup. Please try again.')

    return { ok: true, name: data?.name }
  } catch (err) {
    if (isCancel(err)) return { ok: false, cancelled: true }
    return { ok: false, error: err instanceof Error ? err.message : 'Could not set up Face ID. Please try again.' }
  }
}

/**
 * Sign in with a passkey. No e-mail needed — the device offers the accounts it
 * holds for this site. On success the member is signed in and `callbackUrl` is
 * where they land.
 */
export async function loginWithPasskey(callbackUrl = '/'): Promise<PasskeyResult> {
  try {
    const optRes = await fetch('/api/auth/passkey/login/options', { method: 'POST' })
    if (!optRes.ok) throw new Error('Could not start sign-in. Please try again.')
    const options = await optRes.json()

    const assertion = await startAuthentication(options)

    const verifyRes = await fetch('/api/auth/passkey/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assertion),
    })
    const data = await verifyRes.json().catch(() => null)
    if (!verifyRes.ok || !data?.ticket) {
      throw new Error(data?.error || 'That didn’t work. Please sign in with your password.')
    }

    // Hand the ticket to NextAuth so this lands on the same sign-in path as a
    // password login (session rotation, approval checks, the lot).
    const res = await signIn('credentials', { passkeyTicket: data.ticket, redirect: false, callbackUrl })
    if (res?.error) throw new Error('That didn’t work. Please sign in with your password.')

    return { ok: true }
  } catch (err) {
    if (isCancel(err)) return { ok: false, cancelled: true }
    return { ok: false, error: err instanceof Error ? err.message : 'Could not sign in with Face ID.' }
  }
}
