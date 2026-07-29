import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

/** Pending proof-of-account submissions, oldest first (fairest queue order). */
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pending = await db.user.findMany({
    where: { accmVerifyStatus: 'pending', role: 'member' },
    select: {
      id: true, name: true, realName: true, email: true, image: true, username: true,
      accmNumber: true, accmProofUrl: true, accmProofAt: true, createdAt: true,
    },
    orderBy: { accmProofAt: 'asc' },
    take: 100,
  })

  return NextResponse.json(pending)
}

/**
 * Approve or reject a submission. Either way the proof image is deleted from
 * Blob storage: it's an account screenshot on a public (if unguessable) URL, and
 * once the decision is made there is no reason to keep holding it.
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
    select: { id: true, role: true, accmProofUrl: true, accmVerifyStatus: true },
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

  return NextResponse.json({ ok: true, accmVerifyStatus: action === 'approve' ? 'verified' : 'rejected' })
}
