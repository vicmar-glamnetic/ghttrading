import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

// Lightweight counts behind the staff nav badges: pending sign-ups (Approvals)
// and pending proof-of-account submissions (Verifications). Both live here so
// the 45s nav poll stays a single request.
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ count: 0, verifications: 0 })

  const [count, verifications] = await Promise.all([
    db.user.count({ where: { approved: false } }),
    db.user.count({ where: { accmVerifyStatus: 'pending', role: 'member' } }),
  ])
  return NextResponse.json({ count, verifications })
}
