import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isGatedMember } from '@/lib/identity'

/**
 * Only accept URLs we minted. Staff render this image in the review queue, so an
 * arbitrary URL here would let a member point the admin's browser at anything —
 * an off-site tracker that leaks staff IPs, or shock content in the queue.
 */
function isOurBlobUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/**
 * Submit a screenshot of the member's ACCM account for staff review. Sets the
 * account to `pending`; a coach or admin decides from /verifications.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, accmMember: true, accmNumber: true, realName: true, accmVerifyStatus: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isGatedMember(user)) {
    return NextResponse.json({ error: 'This only applies to ACCM members.' }, { status: 400 })
  }
  if (user.accmVerifyStatus === 'verified') {
    return NextResponse.json({ error: 'Your account is already verified.' }, { status: 400 })
  }
  // Proof is meaningless without the details it's meant to prove.
  if (!user.accmNumber || !user.realName) {
    return NextResponse.json({ error: 'Add your name and ACCM number first.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) return NextResponse.json({ error: 'Please attach a screenshot first.' }, { status: 400 })
  if (!isOurBlobUrl(url)) return NextResponse.json({ error: 'That upload isn’t valid. Please try again.' }, { status: 400 })

  await db.user.update({
    where: { id: user.id },
    data: {
      accmProofUrl: url,
      accmProofAt: new Date(),
      accmVerifyStatus: 'pending',
      accmRejectReason: null,
    },
  })

  return NextResponse.json({ accmVerifyStatus: 'pending' })
}
