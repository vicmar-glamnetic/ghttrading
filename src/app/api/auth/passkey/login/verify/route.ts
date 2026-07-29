import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { db } from '@/lib/db'
import { issueTicket } from '@/lib/securityCode'
import { clearChallenge, readChallenge, relyingParty } from '@/lib/webauthn'

/**
 * Verify a passkey assertion and hand back a one-minute, single-use ticket.
 *
 * This route does NOT create a session. The ticket goes to NextAuth's
 * authorize(), so passkey sign-in lands in exactly the same place as password
 * sign-in — same approval checks, same single-session token rotation. One door.
 */
export async function POST(req: Request) {
  const expectedChallenge = await readChallenge()
  await clearChallenge()   // single-use, pass or fail
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'That took too long. Please try again.' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const authenticator = await db.authenticator.findUnique({
    where: { credentialID: String(body.id) },
    select: {
      id: true, credentialID: true, credentialPublicKey: true, counter: true, transports: true,
      user: { select: { id: true, emailVerified: true } },
    },
  })
  // Same generic message whether the credential is unknown or the signature is
  // bad — a sign-in screen shouldn't confirm which passkeys exist.
  const failed = () => NextResponse.json({ error: 'That didn’t work. Please sign in with your password.' }, { status: 401 })
  if (!authenticator) return failed()

  const rp = relyingParty()
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
        counter: authenticator.counter,
        transports: authenticator.transports?.split(',').filter(Boolean) as never,
      },
    })
  } catch (err) {
    console.error('[PASSKEY_LOGIN_VERIFY]', err)
    return failed()
  }

  if (!verification.verified) return failed()

  // The signature counter only ever goes up. A repeat or lower value means the
  // credential was cloned, so refuse it rather than quietly allowing a replay.
  const { newCounter } = verification.authenticationInfo
  if (authenticator.counter > 0 && newCounter <= authenticator.counter) {
    console.error('[PASSKEY_COUNTER_REGRESSION]', { credentialID: authenticator.credentialID })
    return failed()
  }

  // Mirrors the password path: unverified e-mails never get a session.
  if (!authenticator.user.emailVerified) return failed()

  await db.authenticator.update({
    where: { id: authenticator.id },
    data: { counter: newCounter, lastUsedAt: new Date() },
  })

  const ticket = await issueTicket(authenticator.user.id, 'passkey')
  return NextResponse.json({ ticket })
}
