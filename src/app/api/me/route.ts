import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Current user's live profile fields. Used for avatar/name that the session
// JWT can't carry (large base64 images are stripped from the token to keep the
// auth cookie small), so the nav/composers read the real image from here.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, realName: true, username: true, image: true, role: true, acctBalance: true, acctRiskPct: true, shareStats: true, accmMember: true, accmNumber: true, accmVerifyStatus: true, accmRejectReason: true, dailyLossLimit: true, maxTradesPerDay: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

const numOrNull = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))

// Save trader prefs (account size / risk for auto-sizing, leaderboard opt-in).
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: {
    acctBalance?: number | null; acctRiskPct?: number | null; shareStats?: boolean
    dailyLossLimit?: number | null; maxTradesPerDay?: number | null
  } = {}
  if ('acctBalance' in body) data.acctBalance = numOrNull(body.acctBalance)
  if ('acctRiskPct' in body) data.acctRiskPct = numOrNull(body.acctRiskPct)
  if ('shareStats' in body) data.shareStats = Boolean(body.shareStats)
  // Guardrails are magnitudes — a member typing "-200" means a $200 loss limit,
  // and a negative limit would never trigger.
  if ('dailyLossLimit' in body) {
    const n = numOrNull(body.dailyLossLimit)
    data.dailyLossLimit = n == null ? null : Math.abs(n)
  }
  if ('maxTradesPerDay' in body) {
    const n = numOrNull(body.maxTradesPerDay)
    data.maxTradesPerDay = n == null ? null : Math.max(1, Math.round(Math.abs(n)))
  }
  // The ACCM number is no longer writable here. It is half of a member's public
  // display name and it keys their rebates, so it changes only through
  // POST /api/me/identity, which validates the format and demands an e-mailed
  // code. Leaving a second, unprotected door open would defeat that entirely.
  if ('accmNumber' in body) {
    return NextResponse.json(
      { error: 'Change your ACCM number from Settings → Account identity.', identityLocked: true },
      { status: 400 },
    )
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { acctBalance: true, acctRiskPct: true, shareStats: true, dailyLossLimit: true, maxTradesPerDay: true },
  })
  return NextResponse.json(user)
}
