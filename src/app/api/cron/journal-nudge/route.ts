import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasAccess } from '@/lib/billing'
import { sendJournalNudgeEmails } from '@/lib/email'
import { sendPushToUsers } from '@/lib/push'

export const runtime = 'nodejs'

// Weekly nudge for members who haven't journaled in the last 7 days.
//   - in-app Notification + push for every eligible member (gentle, free)
//   - email only to those who have journaled before (re-engaging the proven-
//     interested; we don't cold-email people who never opened the feature)
// Triggered by Vercel Cron (GET with Authorization: Bearer CRON_SECRET) or
// manually by an admin (POST). A 6-day guard makes a daily cron effectively
// weekly and prevents double-sends.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET
  const authed = secret && req.headers.get('authorization') === `Bearer ${secret}`
  if (!authed) {
    const session = await auth()
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Dedupe: skip if we already nudged in the last 6 days.
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  const already = await db.notification.findFirst({
    where: { type: 'journal-nudge', createdAt: { gte: sixDaysAgo } },
    select: { id: true },
  })
  if (already) return NextResponse.json({ skipped: 'already nudged this week' })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Who journaled this week — excluded from the nudge.
  const recent = await db.journalEntry.findMany({
    where: { createdAt: { gte: weekAgo } },
    select: { authorId: true },
    distinct: ['authorId'],
  })
  const journaledThisWeek = new Set(recent.map(r => r.authorId))

  // Who has ever journaled — the email segment.
  const ever = await db.journalEntry.findMany({ select: { authorId: true }, distinct: ['authorId'] })
  const everJournaled = new Set(ever.map(r => r.authorId))

  // Candidate members (approved, non-staff — staff get their own tools).
  const candidates = await db.user.findMany({
    where: { approved: true, role: 'member' },
    select: {
      id: true, name: true, email: true, role: true,
      subscriptionStatus: true, accmMember: true, trialEndsAt: true,
    },
  })

  const eligible = candidates.filter(u => hasAccess(u) && !journaledThisWeek.has(u.id))
  if (eligible.length === 0) return NextResponse.json({ skipped: 'nobody to nudge' })

  // In-app notification for everyone eligible.
  await db.notification.createMany({
    data: eligible.map(u => ({
      type: 'journal-nudge',
      message: "You haven't logged a trade this week — journaling is how you find your edge. Takes 60 seconds.",
      link: '/journal?compose=prompt',
      receiverId: u.id,
    })),
  })

  // Push (no-op if VAPID unconfigured or no subscriptions).
  await sendPushToUsers(eligible.map(u => u.id), {
    title: 'How did your week trade? 📓',
    body: 'Log this week’s trades — it takes a minute and sharpens your edge.',
    url: '/journal?compose=prompt',
    tag: 'journal-nudge',
  }).catch(() => {})

  // Email only lapsed journalers (proven interested), and only if configured.
  let email = { sent: 0, failed: 0 }
  const emailOn = process.env.RESEND_API_KEY && process.env.JOURNAL_NUDGE_EMAIL !== 'false'
  if (emailOn) {
    const recipients = eligible
      .filter(u => everJournaled.has(u.id) && u.email)
      .map(u => ({ email: u.email, name: u.name }))
    if (recipients.length) email = await sendJournalNudgeEmails(recipients).catch(() => ({ sent: 0, failed: recipients.length }))
  }

  return NextResponse.json({ nudged: eligible.length, notified: eligible.length, email })
}

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }
