import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff, canManageRole, COACH_ASSIGNABLE_ROLES, ROLES, FREE_ROLES, type Role } from '@/lib/admin'
import { sendApprovalEmail, sendVerifiedEmail } from '@/lib/email'
import { VERIFY_STATUSES, namePartOf, needsVerification } from '@/lib/identity'

const USER_SELECT = {
  id: true, name: true, email: true, username: true, image: true,
  role: true, approved: true, accmMember: true, accmVerifyStatus: true, subscriptionStatus: true, paymentRef: true, trialEndsAt: true, subscriptionEnd: true, createdAt: true,
}

const SUB_STATUSES = ['free', 'active', 'comp', 'canceled', 'past_due', 'pending']

const DAY = 24 * 60 * 60 * 1000
const MAX_TRIAL_DAYS = 365

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, approved: true, accmVerifyStatus: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Coaches manage members and coaches; admin accounts stay out of their reach.
  if (!canManageRole(session.user.role, target.role)) {
    return NextResponse.json({ error: 'Coaches cannot modify admin accounts' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.role != null) {
    if (!(ROLES as readonly string[]).includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    // Nobody demotes themselves — an admin would lock themselves out, and a
    // coach could otherwise drop their own staff access by accident.
    if (userId === session.user.id && body.role !== session.user.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }
    if (session.user.role === 'coach' && !COACH_ASSIGNABLE_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Coaches cannot grant the admin role' }, { status: 403 })
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

  // Manual verification override. Proof-of-account upload blocks the app
  // (PROOF_REQUIRED), so a member who can't produce a screenshot — no phone,
  // account opened through an agent, whatever — would otherwise be stuck with
  // nobody able to help them. Staff can vouch for them here instead.
  if (typeof body.accmVerifyStatus === 'string') {
    if (!(VERIFY_STATUSES as readonly string[]).includes(body.accmVerifyStatus)) {
      return NextResponse.json({ error: 'Invalid verification status' }, { status: 400 })
    }
    data.accmVerifyStatus = body.accmVerifyStatus
    data.accmVerifiedById = session.user.id
    data.accmVerifiedAt = body.accmVerifyStatus === 'verified' ? new Date() : null
    data.accmRejectReason = null
    // Taking verification away has to stick. New accounts verify themselves off
    // their own screenshot, so leaving that on would let the member re-upload
    // and undo the admin a second later.
    if (body.accmVerifyStatus !== 'verified') data.accmAutoVerify = false
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

  // Notify the user when an admin flips them from pending to approved. Read the
  // verification gate off the row as it stands *after* this save — approving
  // someone who still owes us an account screenshot must not promise them full
  // access, since the pop-up will stop them the second they log in.
  if (data.approved === true && !target.approved && updated.email) {
    try {
      await sendApprovalEmail(updated.email, namePartOf(updated.name), needsVerification(updated))
    } catch (err) {
      console.error('Failed to send approval email:', err)
    }
  }

  // Same as the verification queue: being verified is what lifts the block, and
  // a member who was locked out won't see an in-app notification. Only on the
  // transition, so re-saving an already-verified member doesn't re-mail them.
  if (data.accmVerifyStatus === 'verified' && target.accmVerifyStatus !== 'verified' && updated.email) {
    try {
      await sendVerifiedEmail(updated.email, namePartOf(updated.name))
    } catch (err) {
      console.error('Failed to send verification email:', err)
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canManageRole(session.user.role, target.role)) {
    return NextResponse.json({ error: 'Coaches cannot delete admin accounts' }, { status: 403 })
  }

  await db.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
