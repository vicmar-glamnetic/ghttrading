import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { sendWinBackEmails } from '@/lib/email'
import type { Prisma } from '@/generated/prisma/client'

// "Expired non-ACCM member": a paying-tier member on the standard ($5) tier
// (not an ACCM member) who no longer has access — their subscription isn't
// active/comped and their trial (if any) has run out.
function eligibleWhere(): Prisma.UserWhereInput {
  return {
    role: 'member',
    accmMember: false,
    subscriptionStatus: { notIn: ['active', 'comp'] },
    OR: [
      { trialEndsAt: null },
      { trialEndsAt: { lt: new Date() } },
    ],
  }
}

// How many expired non-ACCM members would receive the win-back email.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const count = await db.user.count({ where: eligibleWhere() })
  return NextResponse.json({ count })
}

// Blast the $5 win-back email to every expired non-ACCM member.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const recipients = await db.user.findMany({
    where: eligibleWhere(),
    select: { email: true, name: true },
  })

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  try {
    const { sent, failed } = await sendWinBackEmails(recipients)
    return NextResponse.json({ sent, failed, total: recipients.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send emails'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
