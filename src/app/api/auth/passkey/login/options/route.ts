import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { relyingParty, setChallenge } from '@/lib/webauthn'

/**
 * Start a passkey sign-in. Public, and deliberately takes no e-mail: the
 * credentials are discoverable, so the device itself offers the right account.
 *
 * That also means this endpoint reveals nothing — it returns the same challenge
 * whoever calls it, so it can't be used to test whether an address has an
 * account here.
 */
export async function POST() {
  const rp = relyingParty()
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    // No allowCredentials — the browser picks from the passkeys it holds for us.
    userVerification: 'required',
  })

  await setChallenge(options.challenge)
  return NextResponse.json(options)
}
