import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// A member reports they've sent a manual/crypto payment. Marks them "pending"
// so an admin can verify and activate. Stores the tx hash / reference.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ref } = await req.json().catch(() => ({ ref: '' }))

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { subscriptionStatus: true } })
  // Already active/comp — nothing to claim.
  if (user && ['active', 'comp'].includes(user.subscriptionStatus)) {
    return NextResponse.json({ ok: true, alreadyActive: true })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { subscriptionStatus: 'pending', paymentRef: (ref ?? '').toString().trim().slice(0, 120) || null },
  })

  return NextResponse.json({ ok: true })
}
