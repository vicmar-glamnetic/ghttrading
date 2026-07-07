// Cloudflare Turnstile (bot check). Free — get keys at
// dash.cloudflare.com → Turnstile. Set:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (client widget)
//   TURNSTILE_SECRET_KEY            (server verify)
// When the secret isn't set, verification is skipped (feature disabled).
export const turnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY)

export async function verifyTurnstile(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // disabled
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()
    return Boolean(data.success)
  } catch {
    return false
  }
}
