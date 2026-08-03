import { db } from '@/lib/db'
import { sendSignalAlertEmails, type SignalTeaser } from '@/lib/email'
import { getBoolSetting, SETTING_KEYS } from '@/lib/settings'
import type { Prisma } from '@/generated/prisma/client'

// Subscription states that count as paid-up. Mirrors hasAccess() in lib/billing.
const ACTIVE_STATUSES = ['active', 'comp']

/**
 * Who gets the new-signal email:
 *   • coaches — they run the room and want to see what the others posted;
 *   • verified ACCM members — the free tier, but only once their account is
 *     confirmed, so an unverified sign-up can't farm signals out of the inbox;
 *   • non-ACCM (Standard) members with access — paid, comped, or still inside
 *     their trial window.
 * Deliberately NOT everyone: unverified, rejected and lapsed accounts are
 * exactly the people the signal is gated from inside the app.
 */
export function signalEmailRecipientWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    OR: [
      { role: 'coach' },
      { role: 'member', accmMember: true, accmVerifyStatus: 'verified' },
      {
        role: 'member',
        accmMember: false,
        OR: [
          { subscriptionStatus: { in: ACTIVE_STATUSES } },
          { trialEndsAt: { gt: now } },
        ],
      },
    ],
  }
}

/** How many people the toggle would mail right now — shown on the admin screen. */
export function countSignalEmailRecipients() {
  return db.user.count({ where: signalEmailRecipientWhere() })
}

/** "3320" or "3320–3324" — the entry as members read it. Null when unpriced. */
export function formatEntryZone(entryLow?: number | null, entryHigh?: number | null): string | null {
  if (entryLow == null && entryHigh == null) return null
  if (entryLow == null) return `${entryHigh}`
  if (entryHigh == null || entryHigh === entryLow) return `${entryLow}`
  return `${entryLow}–${entryHigh}`
}

/**
 * Emails the community about a new public signal, if the admin toggle is on.
 * Call it from `after()` — it must never delay or fail the signal itself, so
 * every step swallows its own errors and the result is only ever logged.
 */
export async function emailNewSignal(
  signal: SignalTeaser,
  excludeUserId?: string,
): Promise<{ skipped?: string; sent?: number; failed?: number; total?: number }> {
  try {
    if (!(await getBoolSetting(SETTING_KEYS.signalEmailAlerts))) return { skipped: 'toggle off' }

    const where = signalEmailRecipientWhere()
    const recipients = await db.user.findMany({
      // The author already knows — they just posted it.
      where: excludeUserId ? { AND: [where, { id: { not: excludeUserId } }] } : where,
      select: { email: true, name: true },
    })
    if (recipients.length === 0) return { skipped: 'no recipients', total: 0 }

    const { sent, failed } = await sendSignalAlertEmails(recipients, signal)
    console.log(`[SIGNAL_EMAIL] ${signal.symbol} ${signal.direction} — sent ${sent}/${recipients.length}${failed ? `, ${failed} failed` : ''}`)
    return { sent, failed, total: recipients.length }
  } catch (e) {
    console.error('[SIGNAL_EMAIL]', e)
    return { skipped: 'error' }
  }
}
