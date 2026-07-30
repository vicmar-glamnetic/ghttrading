import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { sendApprovalEmail } from '@/lib/email'

// Coaches/admins can review and approve pending sign-ups (no other admin powers).
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pending = await db.user.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'desc' },
    // realName + the proof screenshot come along so the sign-up can be judged
    // here rather than approved blind and checked later. ACCM members upload
    // theirs from /pending, before this queue ever sees them.
    select: {
      id: true, name: true, email: true, username: true, image: true, createdAt: true,
      accmMember: true, accmNumber: true, realName: true,
      accmProofUrl: true, accmVerifyStatus: true, accmProofAt: true,
    },
  })
  return NextResponse.json(pending)
}

export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { approved: true, accmProofUrl: true, accmVerifyStatus: true, accmVerifiedById: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The reviewer just approved this sign-up with the screenshot on screen, so
  // it has been seen by a human — record who, which also takes the member off
  // the /verifications spot-check list instead of asking staff to look twice.
  const reviewedProof = user.accmVerifyStatus === 'verified' && !!user.accmProofUrl && !user.accmVerifiedById

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      approved: true,
      ...(reviewedProof ? { accmVerifiedById: session.user.id, accmProofUrl: null } : {}),
    },
    select: { email: true, name: true },
  })

  // Best-effort — an account screenshot shouldn't sit on a public URL once it
  // has done its job, but a storage hiccup must never fail the approval.
  if (reviewedProof && user.accmProofUrl) {
    try {
      await del(user.accmProofUrl)
    } catch (err) {
      console.error('[APPROVAL_BLOB_DELETE]', err)
    }
  }

  // Only notify on the transition into approved, and never let a mail hiccup
  // fail the approval itself.
  if (!user.approved && updated.email) {
    try {
      await sendApprovalEmail(updated.email, updated.name)
    } catch (err) {
      console.error('Failed to send approval email:', err)
    }
  }

  return NextResponse.json({ ok: true })
}

// Reject (delete) a not-yet-approved sign-up — e.g. a duplicate or bogus account.
export async function DELETE(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { approved: true, accmProofUrl: true } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Safety: only pending (unapproved) accounts can be rejected here.
  if (user.approved) return NextResponse.json({ error: 'User already approved' }, { status: 400 })

  await db.user.delete({ where: { id: userId } })

  // The row is gone, so nothing points at their screenshot any more — delete it
  // too rather than orphaning an account picture in Blob storage forever.
  if (user.accmProofUrl) {
    try {
      await del(user.accmProofUrl)
    } catch (err) {
      console.error('[APPROVAL_BLOB_DELETE]', err)
    }
  }

  return NextResponse.json({ ok: true })
}
