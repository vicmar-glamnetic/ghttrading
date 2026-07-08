import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ROLES, FREE_ROLES, type Role } from '@/lib/admin'

const USER_SELECT = {
  id: true, name: true, email: true, username: true, image: true,
  role: true, accmMember: true, subscriptionStatus: true, paymentRef: true, subscriptionEnd: true, createdAt: true,
}

const SUB_STATUSES = ['free', 'active', 'comp', 'canceled', 'past_due', 'pending']

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.role != null) {
    if (!(ROLES as readonly string[]).includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    // Prevent an admin from removing their own admin access (avoid lockout).
    if (userId === session.user.id && body.role !== 'admin') {
      return NextResponse.json({ error: 'You cannot change your own admin role' }, { status: 400 })
    }
    const role: Role = body.role
    data.role = role
    // Keep billing status consistent: free-access roles are comped.
    data.subscriptionStatus = FREE_ROLES.includes(role) ? 'comp' : 'free'
  }

  if (body.subscriptionStatus != null) {
    if (!SUB_STATUSES.includes(body.subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 })
    }
    data.subscriptionStatus = body.subscriptionStatus
  }

  if (typeof body.accmMember === 'boolean') {
    data.accmMember = body.accmMember
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.user.update({ where: { id: userId }, data, select: USER_SELECT })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
