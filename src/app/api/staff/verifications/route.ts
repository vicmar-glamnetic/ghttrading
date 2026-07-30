import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { sendVerifiedEmail } from '@/lib/email'
import { namePartOf } from '@/lib/identity'

const SELECT = {
  id: true, name: true, realName: true, email: true, image: true, username: true,
  accmNumber: true, accmProofUrl: true, accmProofAt: true, createdAt: true,
} as const

/**
 * Two lists, because there are now two kinds of member here:
 *
 * `pending` — accounts that pre-date self-verification. Nobody sees the app
 * until staff decides, so this is the queue and it comes oldest first (fairest).
 *
 * `selfVerified` — accounts registered since. They verified themselves off their
 * own screenshot and are already inside; this is the audit trail, newest first,
 * so staff can spot-check the picture and revoke anything that doesn't hold up.
 * A row drops off it as soon as staff acts on it (which clears the screenshot).
 */
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [pending, selfVerified] = await Promise.all([
    db.user.findMany({
      where: { accmVerifyStatus: 'pending', role: 'member' },
      select: SELECT,
      orderBy: { accmProofAt: 'asc' },
      take: 100,
    }),
    db.user.findMany({
      // accmVerifiedById null is what says "no coach decided this" — once one
      // does, the row is reviewed and leaves the list.
      where: {
        accmVerifyStatus: 'verified', role: 'member',
        accmAutoVerify: true, accmVerifiedById: null, accmProofUrl: { not: null },
      },
      select: { ...SELECT, accmVerifiedAt: true },
      orderBy: { accmVerifiedAt: 'desc' },
      take: 100,
    }),
  ])

  return NextResponse.json({ pending, selfVerified })
}

/**
 * Approve or reject a submission. Either way the proof image is deleted from
 * Blob storage: it's an account screenshot on a public (if unguessable) URL, and
 * once the decision is made there is no reason to keep holding it.
 *
 * Both actions also work on a self-verified member: approving is staff signing
 * off on the screenshot (and clearing it), rejecting is a revoke that puts them
 * straight back behind the gate.
 */
export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const action = body.action === 'reject' ? 'reject' : body.action === 'approve' ? 'approve' : null
  if (!userId || !action) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accmProofUrl: true, accmVerifyStatus: true, email: true, name: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Staff accounts aren't part of this flow at all.
  if (target.role !== 'member') return NextResponse.json({ error: 'That account isn’t a member.' }, { status: 400 })

  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : ''
  if (action === 'reject' && !reason) {
    return NextResponse.json({ error: 'Give the member a reason so they can fix it.' }, { status: 400 })
  }

  await db.user.update({
    where: { id: userId },
    data: action === 'approve'
      ? {
          accmVerifyStatus: 'verified',
          accmVerifiedAt: new Date(),
          accmVerifiedById: session.user.id,
          accmRejectReason: null,
          accmProofUrl: null,
        }
      : {
          accmVerifyStatus: 'rejected',
          accmVerifiedAt: null,
          accmVerifiedById: session.user.id,
          accmRejectReason: reason,
          accmProofUrl: null,
          // Turn self-verification off for this account. Without this a rejected
          // member would re-upload and instantly verify themselves again, and
          // the rejection would mean nothing — their next screenshot goes to the
          // queue where a human sees it.
          accmAutoVerify: false,
        },
  })

  // Best-effort cleanup — a stale blob must never fail the decision.
  if (target.accmProofUrl) {
    try {
      await del(target.accmProofUrl)
    } catch (err) {
      console.error('[VERIFICATION_BLOB_DELETE]', err)
    }
  }

  // Signing off on a screenshot that already verified itself changes nothing for
  // the member — they've been inside the app since they uploaded it — so telling
  // them "you're verified" now would just be confusing. Only a real change of
  // state is worth a notification.
  const alreadyVerified = action === 'approve' && target.accmVerifyStatus === 'verified'

  if (!alreadyVerified) {
    await db.notification.create({
      data: {
        type: 'verification',
        receiverId: userId,
        senderId: session.user.id,
        message: action === 'approve'
          ? 'Your ACCM account is verified ✅'
          : `Your ACCM verification needs another look: ${reason}`,
        link: '/settings',
      },
    }).catch(err => console.error('[VERIFICATION_NOTIFY]', err))
  }

  // An approved member was locked out until this moment, so they have no reason
  // to open the app and would never see the in-app notification. E-mail is what
  // actually tells them the block is lifted. Best-effort: a mail failure must
  // never undo a decision that's already saved.
  if (action === 'approve' && !alreadyVerified && target.email) {
    try {
      await sendVerifiedEmail(target.email, namePartOf(target.name))
    } catch (err) {
      console.error('[VERIFICATION_EMAIL]', err)
    }
  }

  return NextResponse.json({ ok: true, accmVerifyStatus: action === 'approve' ? 'verified' : 'rejected' })
}
