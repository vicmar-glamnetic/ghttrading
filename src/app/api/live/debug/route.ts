import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { requireStaff } from '@/lib/admin'
import { jaasConfigured, signJaasToken } from '@/lib/jaas'

// TEMPORARY diagnostics for JaaS setup. Staff-only. Returns NO secrets — just
// the (public) kid/appId, whether the private key parses, and the decoded
// header/payload of a freshly-signed token. Delete once the room works.
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const out: Record<string, unknown> = {
    jaasConfigured: jaasConfigured(),
    appId: process.env.JAAS_APP_ID ?? null,
    kid: process.env.JAAS_API_KEY_ID ?? null,
  }

  // Does the private key parse, and is it actually an RSA private key?
  try {
    const pem = (process.env.JAAS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
    const key = crypto.createPrivateKey(pem)
    // Derive the matching public key (public keys aren't secret) so we can
    // confirm the private key belongs to the registered API key pair.
    const publicKey = crypto.createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString()
    out.privateKey = { ok: true, type: key.asymmetricKeyType, derivedPublicKey: publicKey }
  } catch (e) {
    out.privateKey = { ok: false, error: (e as Error).message }
  }

  // Decode a freshly-signed token (header + payload only — signature dropped).
  try {
    const jwt = signJaasToken({
      userId: session.user.id,
      name: session.user.name,
      avatar: session.user.image,
      moderator: true,
    })
    const [h, p] = jwt.split('.')
    out.token = {
      header: JSON.parse(Buffer.from(h, 'base64url').toString()),
      payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
    }
  } catch (e) {
    out.token = { error: (e as Error).message }
  }

  return NextResponse.json(out)
}
