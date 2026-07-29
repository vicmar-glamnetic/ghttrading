import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { issueCode } from '@/lib/securityCode'
import { sendIdentityCodeEmail } from '@/lib/email'
import { isGatedMember, namePartOf } from '@/lib/identity'

/**
 * E-mail a step-up code for an identity change. Rate-limited in issueCode()
 * (one per minute per member) so this can't be turned into a mail cannon.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, accmMember: true },
  })
  if (!user?.email) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isGatedMember(user)) {
    return NextResponse.json({ error: 'This only applies to ACCM members.' }, { status: 400 })
  }

  const issued = await issueCode(user.id, 'identity')
  if (!issued.ok) {
    return NextResponse.json({ error: issued.error, retryAfterSec: issued.retryAfterSec }, { status: 429 })
  }

  try {
    await sendIdentityCodeEmail(user.email, issued.code, namePartOf(user.name) || null)
  } catch (err) {
    console.error('[IDENTITY_CODE_EMAIL]', err)
    return NextResponse.json({ error: 'We couldn’t send the code. Please try again in a moment.' }, { status: 502 })
  }

  // Never echo the code or the full address back to the browser.
  const [local, domain] = user.email.split('@')
  const masked = `${local.slice(0, 2)}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`
  return NextResponse.json({ sent: true, email: masked })
}
