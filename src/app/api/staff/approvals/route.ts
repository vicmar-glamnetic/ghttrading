import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

// Coaches/admins can review and approve pending sign-ups (no other admin powers).
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pending = await db.user.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, username: true, image: true, createdAt: true, accmMember: true },
  })
  return NextResponse.json(pending)
}

export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { approved: true } })
  return NextResponse.json({ ok: true })
}

// Reject (delete) a not-yet-approved sign-up — e.g. a duplicate or bogus account.
export async function DELETE(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { approved: true } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Safety: only pending (unapproved) accounts can be rejected here.
  if (user.approved) return NextResponse.json({ error: 'User already approved' }, { status: 400 })

  await db.user.delete({ where: { id: userId } })
  return NextResponse.json({ ok: true })
}
