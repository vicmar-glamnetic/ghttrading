import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

// Lightweight count of pending sign-ups, for the Approvals nav badge.
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ count: 0 })

  const count = await db.user.count({ where: { approved: false } })
  return NextResponse.json({ count })
}
