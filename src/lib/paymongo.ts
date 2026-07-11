// PayMongo REST helpers (server-only). Uses the Checkout Sessions API so the
// payment page (GCash / Maya) is hosted by PayMongo — no card data touches us.
// Configure via env:
//   PAYMONGO_SECRET_KEY      sk_test_… / sk_live_…
//   PAYMONGO_WEBHOOK_SECRET  whsk_… (from the webhook you register in the dashboard)
import crypto from 'crypto'

const API = 'https://api.paymongo.com/v1'
const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || ''

function authHeader() {
  // PayMongo uses HTTP Basic auth: base64("<secret_key>:").
  return `Basic ${Buffer.from(`${SECRET_KEY}:`).toString('base64')}`
}

export type CheckoutSessionArgs = {
  /** Amount in PHP pesos (whole pesos — converted to centavos here). */
  amountPhp: number
  description: string
  /** Stored on the session so the webhook can map the payment back to a user. */
  userId: string
  email?: string
  successUrl: string
  cancelUrl: string
}

/** Create a hosted checkout session for GCash + Maya and return its details. */
export async function createCheckoutSession(args: CheckoutSessionArgs): Promise<{ id: string; url: string }> {
  const res = await fetch(`${API}/checkout_sessions`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              currency: 'PHP',
              amount: Math.round(args.amountPhp * 100), // centavos
              name: args.description,
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'paymaya'],
          description: args.description,
          reference_number: args.userId,
          success_url: args.successUrl,
          cancel_url: args.cancelUrl,
          send_email_receipt: Boolean(args.email),
          ...(args.email ? { customer_email: args.email } : {}),
          metadata: { userId: args.userId },
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`PayMongo checkout error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const id = json?.data?.id as string
  const url = json?.data?.attributes?.checkout_url as string
  if (!id || !url) throw new Error('PayMongo checkout: missing id/url in response')
  return { id, url }
}

/**
 * Verify a PayMongo webhook signature.
 * Header format: `t=<timestamp>,te=<test_sig>,li=<live_sig>`.
 * The signature is HMAC-SHA256 of `${t}.${rawBody}` keyed by the webhook secret.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(kv => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()]
    }),
  ) as { t?: string; te?: string; li?: string }

  const t = parts.t
  const provided = parts.li || parts.te // live signature preferred, else test
  if (!t || !provided) return false

  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  } catch {
    return false
  }
}
