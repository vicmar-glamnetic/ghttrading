import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { clearChallenge, deviceLabel, readChallenge, relyingParty } from '@/lib/webauthn'

/** Finish passkey enrolment: verify the attestation and store the public key. */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expectedChallenge = await readChallenge()
  // Single-use, pass or fail — never leave a challenge available for a retry.
  await clearChallenge()
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'That took too long. Please try again.' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const rp = relyingParty()
  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,   // the biometric/PIN actually happened
    })
  } catch (err) {
    console.error('[PASSKEY_REGISTER_VERIFY]', err)
    return NextResponse.json({ error: 'We couldn’t set up Face ID on this device. Please try again.' }, { status: 400 })
  }

  const info = verification.registrationInfo
  if (!verification.verified || !info) {
    return NextResponse.json({ error: 'We couldn’t verify this device. Please try again.' }, { status: 400 })
  }

  const credentialID = Buffer.from(info.credentialID).toString('base64url')
  const name = deviceLabel(req.headers.get('user-agent'))

  try {
    await db.authenticator.create({
      data: {
        credentialID,
        userId: session.user.id,
        credentialPublicKey: Buffer.from(info.credentialPublicKey).toString('base64url'),
        counter: info.counter,
        credentialDeviceType: info.credentialDeviceType,
        credentialBackedUp: info.credentialBackedUp,
        transports: Array.isArray(body.response?.transports) ? body.response.transports.join(',') : null,
        name,
      },
    })
  } catch (err) {
    // Already enrolled on this device — that's a success from the member's side.
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ ok: true, name, alreadyRegistered: true })
    }
    throw err
  }

  return NextResponse.json({ ok: true, name })
}
