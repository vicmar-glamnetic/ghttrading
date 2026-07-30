import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { sendLiveAnnounceEmails } from '@/lib/email'
import type { Prisma } from '@/generated/prisma/client'

// Everyone who can actually open the live page — approved accounts only, so we
// never email sign-ups still sitting behind the approval gate.
const RECIPIENTS: Prisma.UserWhereInput = { approved: true }

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

  try {
    const { sent, failed } = await sendLiveAnnounceEmails(recipients, webinar.title)
    return NextResponse.json({ sent, failed, total: recipients.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send emails'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
