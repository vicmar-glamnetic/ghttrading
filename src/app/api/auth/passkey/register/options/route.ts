import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { relyingParty, setChallenge } from '@/lib/webauthn'

/**
 * Start passkey enrolment. Signed-in members only — a passkey is added to an
 * account you already control, never used to create one.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, authenticators: { select: { credentialID: true, transports: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rp = relyingParty()
  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    // Becomes the credential's user handle, which is what lets sign-in work
    // without the member typing an e-mail address.
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: 'none',   // we don't need to identify the hardware vendor
    // Stops "you already have a passkey here" duplicates on the same device.
    excludeCredentials: user.authenticators.map(a => ({
      id: Buffer.from(a.credentialID, 'base64url'),
      type: 'public-key' as const,
      transports: a.transports?.split(',').filter(Boolean) as never,
    })),
    authenticatorSelection: {
      // The built-in authenticator — Face ID / Touch ID / Windows Hello — rather
      // than a roaming USB key, which is what members actually have.
      authenticatorAttachment: 'platform',
      // Discoverable, so sign-in needs no e-mail typed.
      residentKey: 'required',
      // Require the biometric/PIN, not merely a present finger. This is what
      // makes it a second factor rather than "whoever holds the phone".
      userVerification: 'required',
    },
  })

  await setChallenge(options.challenge)
  return NextResponse.json(options)
}
