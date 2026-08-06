import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { sendLiveAnnounceEmails } from '@/lib/email'
import type { Prisma } from '@/generated/prisma/client'

/**
 * Everyone who can actually open the live page, so the email never sends
 * someone to a wall they can't get past:
 *
 *  - approved, so sign-ups still behind the approval gate are skipped;
 *  - and past the verification gate. Mirrors needsVerification() in
 *    lib/identity — staff carry no verify status and $5 other-broker members
 *    can never earn one (no ACCM number to prove), yet neither is gated, so
 *    both are in. Only ACCM members sitting on unverified/pending/rejected
 *    are left out — they're locked out of the app until a coach reviews them.
 */
const RECIPIENTS: Prisma.UserWhereInput = {
  approved: true,
  OR: [
    { role: { in: ['admin', 'coach'] } },
    { accmVerifyStatus: 'verified' },
    { role: 'member', accmMember: false },
  ],
}

// How many members a "we're live" blast would reach.
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const count = await db.user.count({ where: RECIPIENTS })
  return NextResponse.json({ count })
}

// Email every approved member that the session is live. Deliberately manual:
// staff decide when the stream is really up, so restarting it doesn't re-blast.
export async function POST() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const webinar = await db.liveWebinar.findUnique({ where: { id: 'default' } })
  if (!webinar?.isLive) {
    return NextResponse.json({ error: 'Not live yet — toggle the session live first.' }, { status: 400 })
  }

  const recipients = await db.user.findMany({
    where: RECIPIENTS,
    select: { email: true, name: true },
  })
  if (recipients.length === 0) return NextResponse.json({ sent: 0, failed: 0, total: 0 })

  // The stream's own link, so the email carries somewhere to watch even outside
  // the app. Only in webinar mode — an interactive room is a Jitsi embed that
  // needs a per-user token from /api/live/token, so its slug isn't a link
  // anyone could open.
  const streamUrl = webinar.mode === 'webinar' ? webinar.embedUrl : null

  try {
    const { sent, failed } = await sendLiveAnnounceEmails(recipients, webinar.title, streamUrl)
    return NextResponse.json({ sent, failed, total: recipients.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send emails'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
