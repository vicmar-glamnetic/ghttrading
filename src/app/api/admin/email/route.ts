import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { sendBroadcastEmails } from '@/lib/email'
import { AUDIENCES, isAudience, isSafeUrl, DEFAULT_AUDIENCE, type AudienceValue } from '@/lib/broadcast'
import type { Prisma } from '@/generated/prisma/client'

const DAY = 24 * 60 * 60 * 1000
const INACTIVE_DAYS = 30

/** One send can't exceed this. A slip in the UI shouldn't be able to mail the world. */
const MAX_RECIPIENTS = 1000

const RECIPIENT_SELECT = {
  id: true, name: true, email: true, image: true,
  role: true, accmMember: true, accmNumber: true, accmVerifyStatus: true,
  subscriptionStatus: true, createdAt: true, lastSeenAt: true,
}

/**
 * Turns an audience into a query. Every bucket except 'everyone' is scoped to
 * `role: 'member'` — staff have their own channels, and a nudge about opening an
 * ACCM account reads as noise to the coach who wrote the signals.
 */
function audienceWhere(audience: AudienceValue, now: Date = new Date()): Prisma.UserWhereInput {
  switch (audience) {
    // The sign-up follow-up list: they came in on the ACCM (free) tier but have
    // never put an account number on file, so the broker step never happened.
    case 'accm-no-account':
      return { role: 'member', accmMember: true, accmNumber: null }
    case 'accm-unverified':
      return { role: 'member', accmMember: true, accmVerifyStatus: 'unverified' }
    case 'accm-pending':
      return { role: 'member', accmMember: true, accmVerifyStatus: 'pending' }
    case 'standard':
      return { role: 'member', accmMember: false }
    case 'expired':
      return {
        role: 'member',
        subscriptionStatus: { notIn: ['active', 'comp'] },
        OR: [{ trialEndsAt: null }, { trialEndsAt: { lt: now } }],
      }
    case 'inactive':
      return {
        role: 'member',
        OR: [
          { lastSeenAt: null },
          { lastSeenAt: { lt: new Date(now.getTime() - INACTIVE_DAYS * DAY) } },
        ],
      }
    case 'members':
      return { role: 'member' }
    case 'everyone':
      return {}
  }
}

/** The recipient list for one audience, plus the size of every other bucket. */
export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = new URL(req.url).searchParams
  const audienceParam = params.get('audience')
  const audience: AudienceValue = isAudience(audienceParam) ? audienceParam : DEFAULT_AUDIENCE
  const q = params.get('q')?.trim()

  const where: Prisma.UserWhereInput = { ...audienceWhere(audience) }
  if (q) {
    // AND-ed with the audience's own OR clauses rather than merged into them,
    // so searching inside "inactive" can't widen the bucket.
    where.AND = [{
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { accmNumber: { contains: q, mode: 'insensitive' } },
      ],
    }]
  }

  // Every bucket's size comes back with the list, so the composer can label the
  // audience picker without a request per tab.
  const now = new Date()
  const [users, counts] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, select: RECIPIENT_SELECT }),
    Promise.all(AUDIENCES.map(a => db.user.count({ where: audienceWhere(a.value, now) }))),
  ])

  const audienceCounts: Record<string, number> = {}
  AUDIENCES.forEach((a, i) => { audienceCounts[a.value] = counts[i] })

  return NextResponse.json({ users, audience, audienceCounts, maxRecipients: MAX_RECIPIENTS })
}

interface SendBody {
  subject?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  /**
   * Who to mail — plain addresses, whether typed by hand or added from the
   * member picker. Addresses rather than user ids so the composer can reach
   * someone who has no account (or no longer has one).
   */
  emails?: string[]
  /** Ignores the recipient list and mails the signed-in admin a sample instead. */
  test?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Sends the composed message to an explicit list of addresses — never to a raw filter. */
export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, body, ctaLabel, ctaUrl, emails, test }: SendBody =
    await req.json().catch(() => ({}))

  if (!subject?.trim()) return NextResponse.json({ error: 'A subject is required.' }, { status: 400 })
  if (!body?.trim()) return NextResponse.json({ error: 'The message body is empty.' }, { status: 400 })
  if (ctaLabel?.trim() && !ctaUrl?.trim()) {
    return NextResponse.json({ error: 'The button needs a link.' }, { status: 400 })
  }
  if (ctaUrl?.trim() && !isSafeUrl(ctaUrl)) {
    return NextResponse.json({ error: 'The button link must start with https:// or mailto:.' }, { status: 400 })
  }

  const tpl = { subject: subject.trim(), body: body.trim(), ctaLabel, ctaUrl }

  // Test send: one email, to the admin who's composing, with their own row as
  // the token source so the greeting shows what recipients will actually see.
  if (test) {
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, accmNumber: true },
    })
    if (!me?.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
    const { sent, failed } = await sendBroadcastEmails([me], tpl)
    return NextResponse.json({ sent, failed, total: 1, test: true, to: me.email })
  }

  // Case-insensitive dedupe, so the same person typed twice with different
  // capitalisation is one recipient.
  const addresses = Array.from(new Set(
    (emails ?? []).map(e => e.trim().toLowerCase()).filter(e => EMAIL_RE.test(e)),
  ))
  const rejected = (emails ?? []).filter(e => e.trim() && !EMAIL_RE.test(e.trim()))

  if (addresses.length === 0) {
    return NextResponse.json(
      { error: rejected.length ? `No valid addresses — check "${rejected[0]}".` : 'Add at least one recipient.' },
      { status: 400 },
    )
  }

  // An address that belongs to an account is mailed off that account's row, so
  // {{firstName}} and {{accmNumber}} resolve. Anyone else still gets the mail,
  // with the tokens falling back to their defaults.
  const known = await db.user.findMany({
    where: { email: { in: addresses } },
    select: { email: true, name: true, accmNumber: true },
  })
  const byEmail = new Map(known.map(u => [u.email.toLowerCase(), u]))
  const recipients = addresses.map(email => byEmail.get(email) ?? { email, name: null, accmNumber: null })

  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `That's ${recipients.length} recipients — ${MAX_RECIPIENTS} is the limit for one send.` },
      { status: 400 },
    )
  }

  try {
    const { sent, failed, failedEmails } = await sendBroadcastEmails(recipients, tpl)
    return NextResponse.json({
      sent, failed, failedEmails: failedEmails.slice(0, 20),
      total: recipients.length,
      // How many were addressed by name, so the composer can say whether the
      // tokens actually landed.
      matched: known.length,
      skipped: rejected.slice(0, 20),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send emails'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
