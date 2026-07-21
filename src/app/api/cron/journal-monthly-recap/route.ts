import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasAccess } from '@/lib/billing'
import { sendMonthlyRecapEmails, type MonthlyRecapStats } from '@/lib/email'
import { parseSetups, setupLabel } from '@/lib/setups'

export const runtime = 'nodejs'

// Personalised "your month in numbers" recap for members who journaled last
// month (#8). Seeing a half-filled report is a strong pull to fill it — and a
// full one rewards the habit. Meant to run on the 1st of each month.
// Vercel Cron (GET + CRON_SECRET) or an admin (POST). Guarded so it fires once.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET
  const authed = secret && req.headers.get('authorization') === `Bearer ${secret}`
  if (!authed) {
    const session = await auth()
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Last calendar month [start, end).
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  // Dedupe: don't re-send within 20 days.
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  const already = await db.notification.findFirst({
    where: { type: 'journal-monthly-recap', createdAt: { gte: twentyDaysAgo } },
    select: { id: true },
  })
  if (already) return NextResponse.json({ skipped: 'already sent this month' })

  const entries = await db.journalEntry.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { authorId: true, result: true, pnl: true, setup: true },
  })
  if (entries.length === 0) return NextResponse.json({ skipped: 'no entries last month' })

  // Aggregate per author.
  type Agg = { entries: number; wins: number; losses: number; net: number; hasNet: boolean; setups: Map<string, number> }
  const byUser = new Map<string, Agg>()
  for (const e of entries) {
    const a = byUser.get(e.authorId) ?? { entries: 0, wins: 0, losses: 0, net: 0, hasNet: false, setups: new Map() }
    a.entries++
    if (e.result === 'win') a.wins++
    else if (e.result === 'loss') a.losses++
    if (e.pnl != null) { a.net += e.pnl; a.hasNet = true }
    for (const s of parseSetups(e.setup)) a.setups.set(s, (a.setups.get(s) ?? 0) + 1)
    byUser.set(e.authorId, a)
  }

  const users = await db.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, name: true, email: true, role: true, subscriptionStatus: true, accmMember: true, trialEndsAt: true },
  })

  const recipients: (MonthlyRecapStats & { email: string })[] = []
  for (const u of users) {
    if (!u.email || !hasAccess(u)) continue
    const a = byUser.get(u.id)!
    const decided = a.wins + a.losses
    const topSetup = [...a.setups.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]
    recipients.push({
      email: u.email,
      name: u.name,
      monthLabel,
      entries: a.entries,
      wins: a.wins,
      losses: a.losses,
      winRate: decided ? Math.round((a.wins / decided) * 100) : 0,
      net: a.hasNet ? Math.round(a.net * 100) / 100 : null,
      bestSetup: topSetup ? setupLabel(topSetup) : null,
    })
  }
  if (recipients.length === 0) return NextResponse.json({ skipped: 'no eligible recipients' })

  // In-app notification too (also marks this month as done for the dedupe guard).
  await db.notification.createMany({
    data: recipients.map(r => {
      const u = users.find(x => x.email === r.email)!
      return {
        type: 'journal-monthly-recap',
        message: `Your ${monthLabel} recap: ${r.entries} entries, ${r.winRate}% win rate. Tap to review your month.`,
        link: '/journal?view=analytics',
        receiverId: u.id,
      }
    }),
  })

  let email = { sent: 0, failed: 0 }
  if (process.env.RESEND_API_KEY) {
    email = await sendMonthlyRecapEmails(recipients).catch(() => ({ sent: 0, failed: recipients.length }))
  }

  return NextResponse.json({ recipients: recipients.length, monthLabel, email })
}

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }
