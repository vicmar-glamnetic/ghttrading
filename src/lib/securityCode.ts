import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import { db } from './db'

/**
 * Short-lived e-mail codes that re-confirm a sensitive account change (right now:
 * changing a display name, real name or ACCM number).
 *
 * Why this exists: the session cookie alone is enough to rename an account. If a
 * member leaves a session open on a shared machine, or a token leaks, whoever has
 * it can quietly repoint a trusted community identity — including its ACCM number
 * — at themselves. Requiring a code sent to the account's e-mail means an attacker
 * needs the inbox too.
 *
 * Codes are stored as SHA-256 hashes so a leaked DB row hands out nothing usable.
 */

export const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_CODE_ATTEMPTS = 5
export const RESEND_COOLDOWN_MS = 60 * 1000 // 1 minute between sends

export type CodePurpose = 'identity' | 'passkey'

/**
 * How long a passkey hand-off ticket stays valid. It only has to survive the
 * round trip from "the device verified you" to "NextAuth signs you in", so it's
 * deliberately tiny.
 */
export const TICKET_TTL_MS = 60 * 1000 // 1 minute

const hash = (code: string) => createHash('sha256').update(code).digest('hex')

/** 6 digits, uniformly random — Math.random() is not acceptable for a credential. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; error: string; retryAfterSec: number }

/**
 * Mint (or replace) the code for this user + purpose. Returns the plaintext code
 * for the caller to e-mail — it is never stored or logged.
 */
export async function issueCode(userId: string, purpose: CodePurpose): Promise<IssueResult> {
  const existing = await db.securityCode.findUnique({
    where: { userId_purpose: { userId, purpose } },
    select: { lastSentAt: true },
  })

  if (existing) {
    const since = Date.now() - existing.lastSentAt.getTime()
    if (since < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000)
      return { ok: false, error: `Please wait ${retryAfterSec}s before requesting another code.`, retryAfterSec }
    }
  }

  const code = generateCode()
  const data = {
    codeHash: hash(code),
    expires: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,          // a fresh code gets a fresh attempt budget
    lastSentAt: new Date(),
  }
  await db.securityCode.upsert({
    where: { userId_purpose: { userId, purpose } },
    create: { userId, purpose, ...data },
    update: data,
  })

  return { ok: true, code }
}

/**
 * Mint a single-use hand-off ticket. Used after a WebAuthn assertion verifies:
 * the passkey routes prove who you are, then hand this to NextAuth's authorize()
 * so sign-in still flows through one door (and still rotates sessionToken).
 *
 * Returned as "<userId>.<secret>" so authorize() can find the row from the
 * ticket alone. Only the secret half is hashed and compared.
 *
 * No resend cooldown here, unlike issueCode — nothing is e-mailed, and a member
 * signing in twice in a minute is normal.
 */
export async function issueTicket(userId: string, purpose: CodePurpose): Promise<string> {
  const secret = randomBytes(32).toString('base64url')
  const data = {
    codeHash: hash(secret),
    expires: new Date(Date.now() + TICKET_TTL_MS),
    attempts: 0,
    lastSentAt: new Date(),
  }
  await db.securityCode.upsert({
    where: { userId_purpose: { userId, purpose } },
    create: { userId, purpose, ...data },
    update: data,
  })
  return `${userId}.${secret}`
}

/**
 * Verify and consume a ticket from issueTicket(). Returns the user id it was
 * minted for, or null. Never throws — a bad ticket is just a failed sign-in.
 */
export async function consumeTicket(ticket: string, purpose: CodePurpose): Promise<string | null> {
  const sep = ticket.indexOf('.')
  if (sep <= 0) return null
  const userId = ticket.slice(0, sep)
  const secret = ticket.slice(sep + 1)
  if (!secret) return null

  const row = await db.securityCode.findUnique({ where: { userId_purpose: { userId, purpose } } })
  if (!row) return null

  // Consume first, then compare: even a failed attempt burns the ticket, so a
  // captured one can't be retried and there is nothing to brute force.
  await db.securityCode.delete({ where: { id: row.id } }).catch(() => {})

  if (row.expires.getTime() < Date.now()) return null

  const a = Buffer.from(hash(secret))
  const b = Buffer.from(row.codeHash)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return userId
}

export type VerifyResult = { ok: true } | { ok: false; error: string }

/**
 * Check a submitted code and consume it on success. On failure the attempt is
 * counted; past MAX_CODE_ATTEMPTS the code is destroyed and a new one must be
 * requested, so a 6-digit code can't be walked through.
 */
export async function consumeCode(userId: string, purpose: CodePurpose, submitted: string): Promise<VerifyResult> {
  const clean = (submitted ?? '').replace(/\D/g, '')
  const row = await db.securityCode.findUnique({ where: { userId_purpose: { userId, purpose } } })
  if (!row) return { ok: false, error: 'Request a new code — that one is no longer valid.' }

  if (row.expires.getTime() < Date.now()) {
    await db.securityCode.delete({ where: { id: row.id } }).catch(() => {})
    return { ok: false, error: 'That code has expired. Request a new one.' }
  }

  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await db.securityCode.delete({ where: { id: row.id } }).catch(() => {})
    return { ok: false, error: 'Too many incorrect codes. Request a new one.' }
  }

  const a = Buffer.from(hash(clean))
  const b = Buffer.from(row.codeHash)
  const matches = a.length === b.length && timingSafeEqual(a, b)

  if (!matches) {
    const attempts = row.attempts + 1
    await db.securityCode.update({ where: { id: row.id }, data: { attempts } })
    const left = MAX_CODE_ATTEMPTS - attempts
    return {
      ok: false,
      error: left > 0 ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many incorrect codes. Request a new one.',
    }
  }

  // Single use — consume it so a replayed request can't reuse the same code.
  await db.securityCode.delete({ where: { id: row.id } }).catch(() => {})
  return { ok: true }
}
