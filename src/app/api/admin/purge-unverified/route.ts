import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { sendAccountDeletedEmails } from '@/lib/email'
import { namePartOf } from '@/lib/identity'
import type { Prisma } from '@/generated/prisma/client'

const DAY = 24 * 60 * 60 * 1000

/**
 * Grace period before a never-verified sign-up is swept up. Verification takes
 * a screenshot the member may not have to hand, so a fresh account sitting at
 * 'unverified' is someone still getting round to it, not a stale sign-up.
 */
const PURGE_MIN_AGE_DAYS = 15

/**
 * Who gets purged: ACCM members who never verified, and signed up long enough
 * ago to have had a fair chance.
 *
 * Deliberately narrow on all four counts —
 *  - role 'member': staff are never swept up, whatever their status says.
 *  - accmMember true: non-ACCM (other broker, $5) members are excluded. They
 *    have no ACCM account to verify, so "unverified" says nothing about them.
 *  - status exactly 'unverified': someone waiting in the review queue
 *    ('pending') or rejected has submitted proof, and deleting them would throw
 *    away a decision that's still staff's to make.
 *  - older than the grace period: nobody loses an account they opened this week.
 */
function eligibleWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    role: 'member',
    accmMember: true,
    accmVerifyStatus: 'unverified',
    createdAt: { lt: new Date(now.getTime() - PURGE_MIN_AGE_DAYS * DAY) },
  }
}

// How many accounts the purge would delete.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const count = await db.user.count({ where: eligibleWhere() })
  // The age rule travels with the count so the admin card can state it without
  // keeping its own copy of the number.
  return NextResponse.json({ count, minAgeDays: PURGE_MIN_AGE_DAYS })
}

// Delete every never-verified ACCM member, then tell them they can come back.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // One cutoff for the whole request, so the delete can't reach an account that
  // crossed the 15-day line between the read and the write.
  const now = new Date()
  const targets = await db.user.findMany({
    where: eligibleWhere(now),
    select: { id: true, email: true, name: true },
  })

  if (targets.length === 0) {
    return NextResponse.json({ deleted: 0, sent: 0, failed: 0, total: 0 })
  }

  const ids = targets.map(t => t.id)

  // Bounded by the ids we just read *and* re-checked against the filter, so a
  // member who verifies between the two queries is left alone rather than
  // deleted a moment after becoming eligible to stay.
  const { count: deleted } = await db.user.deleteMany({
    where: { id: { in: ids }, ...eligibleWhere(now) },
  })

  // Mail only the accounts that are actually gone, and only after they're gone:
  // "your account has been removed" must never land in the inbox of someone
  // whose row survived.
  const survived = new Set(
    (await db.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map(u => u.id),
  )
  const recipients = targets
    .filter(t => !survived.has(t.id) && t.email)
    .map(t => ({ email: t.email as string, name: namePartOf(t.name) || null }))

  let sent = 0
  let failed = 0
  try {
    const result = await sendAccountDeletedEmails(recipients)
    sent = result.sent
    failed = result.failed
  } catch (e) {
    // The accounts are already deleted, so a mail failure can't be retried into
    // a different outcome — report it instead of failing the whole request.
    console.error('Failed to send account-deleted emails:', e)
    failed = recipients.length
  }

  return NextResponse.json({ deleted, sent, failed, total: targets.length })
}
