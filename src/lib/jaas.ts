// Server-only: imported exclusively by API routes. Uses node:crypto, which
// cannot bundle into client code — a natural guard against leaking the key.
import crypto from 'node:crypto'

// JaaS = 8x8's hosted Jitsi. A signed RS256 token stamps each participant as a
// moderator or a guest, so coaches/admins are ALWAYS moderator regardless of
// join order and members can't self-promote. Enforced server-side by 8x8.
//
// Set three env vars (from the JaaS console — see the setup notes):
//   JAAS_APP_ID        e.g. vpaas-magic-cookie-xxxxxxxx
//   JAAS_API_KEY_ID    the API key id (kid), e.g. vpaas-magic-cookie-xxxx/abcd12
//   JAAS_PRIVATE_KEY   the RSA private key (PEM). Newlines may be escaped as \n.
// When they're absent we fall back to the free public meet.jit.si (join-first).

export function jaasConfigured(): boolean {
  return Boolean(process.env.JAAS_APP_ID && process.env.JAAS_API_KEY_ID && process.env.JAAS_PRIVATE_KEY)
}

const b64url = (input: string) => Buffer.from(input).toString('base64url')

export function signJaasToken(opts: {
  userId: string
  name?: string | null
  avatar?: string | null
  moderator: boolean
}): string {
  const appId = process.env.JAAS_APP_ID!
  const keyId = process.env.JAAS_API_KEY_ID!
  const privateKey = process.env.JAAS_PRIVATE_KEY!.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', kid: keyId, typ: 'JWT' }
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: '*', // valid for any room in this tenant
    iat: now,
    nbf: now - 10,
    exp: now + 3 * 60 * 60, // 3 hours
    context: {
      user: {
        id: opts.userId,
        name: opts.name || 'Member',
        avatar: opts.avatar || '',
        moderator: opts.moderator ? 'true' : 'false',
      },
      features: {
        // Only moderators (staff) may livestream/record; guests cannot.
        livestreaming: opts.moderator ? 'true' : 'false',
        recording: opts.moderator ? 'true' : 'false',
        transcription: 'false',
        'outbound-call': 'false',
      },
    },
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url')
  return `${signingInput}.${signature}`
}

// JaaS fully-qualified room name: the tenant App ID + our room slug. This is
// what external_api.js expects as `roomName` for the 8x8.vc domain.
export function jaasRoomName(roomName: string): string {
  return `${process.env.JAAS_APP_ID}/${roomName}`
}
