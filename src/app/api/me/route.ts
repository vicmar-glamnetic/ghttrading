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
    select: { id: true, name: true, username: true, image: true, acctBalance: true, acctRiskPct: true, shareStats: true, accmMember: true, accmNumber: true, dailyLossLimit: true, maxTradesPerDay: true },
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
    acctBalance?: number | null; acctRiskPct?: number | null; shareStats?: boolean; accmNumber?: string
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
  if ('accmNumber' in body) {
    const raw = typeof body.accmNumber === 'string' ? body.accmNumber.trim() : ''
    if (!raw) return NextResponse.json({ error: 'ACCM number is required' }, { status: 400 })
    // Enforce one ACCM number per member (a DB unique index backs this up too).
    const taken = await db.user.findFirst({
      where: { accmNumber: raw, NOT: { id: session.user.id } },
      select: { id: true },
    })
    if (taken) return NextResponse.json({ error: 'That ACCM number is already registered to another account.' }, { status: 409 })
    data.accmNumber = raw
  }

  let user
  try {
    user = await db.user.update({
      where: { id: session.user.id },
      data,
      select: { acctBalance: true, acctRiskPct: true, shareStats: true, accmNumber: true, dailyLossLimit: true, maxTradesPerDay: true },
    })
  } catch (err) {
    // Unique-index race: two members submitting the same number at once.
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'That ACCM number is already registered to another account.' }, { status: 409 })
    }
    throw err
  }
  return NextResponse.json(user)
}
