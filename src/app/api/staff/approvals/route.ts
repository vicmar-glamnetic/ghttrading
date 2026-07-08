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
    select: { id: true, name: true, email: true, username: true, image: true, createdAt: true },
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
