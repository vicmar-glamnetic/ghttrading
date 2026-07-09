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
    select: { id: true, name: true, username: true, image: true, acctBalance: true, acctRiskPct: true, shareStats: true },
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
  const data: { acctBalance?: number | null; acctRiskPct?: number | null; shareStats?: boolean } = {}
  if ('acctBalance' in body) data.acctBalance = numOrNull(body.acctBalance)
  if ('acctRiskPct' in body) data.acctRiskPct = numOrNull(body.acctRiskPct)
  if ('shareStats' in body) data.shareStats = Boolean(body.shareStats)

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { acctBalance: true, acctRiskPct: true, shareStats: true },
  })
  return NextResponse.json(user)
}
