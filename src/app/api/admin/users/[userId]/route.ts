import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ROLES, FREE_ROLES, type Role } from '@/lib/admin'
import { sendApprovalEmail } from '@/lib/email'

const USER_SELECT = {
  id: true, name: true, email: true, username: true, image: true,
  role: true, approved: true, accmMember: true, subscriptionStatus: true, paymentRef: true, trialEndsAt: true, subscriptionEnd: true, createdAt: true,
}

const SUB_STATUSES = ['free', 'active', 'comp', 'canceled', 'past_due', 'pending']

const DAY = 24 * 60 * 60 * 1000
const MAX_TRIAL_DAYS = 365

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, approved: true } })
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

  if (typeof body.approved === 'boolean') {
    data.approved = body.approved
  }

  // Trial length, counted from now. 0 ends the trial immediately.
  if (body.trialDays != null) {
    const days = Number(body.trialDays)
    if (!Number.isInteger(days) || days < 0 || days > MAX_TRIAL_DAYS) {
      return NextResponse.json({ error: `Trial days must be a whole number between 0 and ${MAX_TRIAL_DAYS}` }, { status: 400 })
    }
    data.trialEndsAt = days === 0 ? null : new Date(Date.now() + days * DAY)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.user.update({ where: { id: userId }, data, select: USER_SELECT })

  // Notify the user when an admin flips them from pending to approved.
  if (data.approved === true && !target.approved && updated.email) {
    try {
      await sendApprovalEmail(updated.email, updated.name)
    } catch (err) {
      console.error('Failed to send approval email:', err)
    }
  }

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
