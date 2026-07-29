import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/** The member's enrolled devices. Never returns key material. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const passkeys = await db.authenticator.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(passkeys)
}

/**
 * Remove a device. Scoped by userId in the where clause so a member can only
 * ever delete their own — passing someone else's id deletes nothing.
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { count } = await db.authenticator.deleteMany({ where: { id, userId: session.user.id } })
  if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
