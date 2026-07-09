// PayPal REST helpers (server-only). Uses the Subscriptions API.
// Configure via env:
//   PAYPAL_ENV=sandbox|live
//   PAYPAL_CLIENT_ID / NEXT_PUBLIC_PAYPAL_CLIENT_ID   (same value; public one feeds the JS SDK)
//   PAYPAL_CLIENT_SECRET
//   NEXT_PUBLIC_PAYPAL_PLAN_ID   (the $5/mo plan)
//   PAYPAL_WEBHOOK_ID            (for webhook signature verification)

const ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox'
export const PAYPAL_API = ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''

export function paypalConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET)
}

/** OAuth2 client-credentials access token. */
export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`)
  const data = await res.json()
  return data.access_token as string
}

export async function getSubscription(subscriptionId: string) {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`PayPal get subscription error: ${res.status}`)
  return res.json()
}

/** Verify a webhook came from PayPal (guards against spoofed activation). */
export async function verifyWebhook(headers: Headers, body: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: body,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}

async function createProduct(token: string) {
  const res = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Gold Heist Trading Community Membership',
      description: 'Monthly membership to the Gold Heist Trading community',
      type: 'SERVICE',
    }),
  })
  if (!res.ok) throw new Error(`Create product failed: ${await res.text()}`)
  return (await res.json()).id as string
}

async function createPlan(token: string, productId: string, priceUsd: number, name: string) {
  const res = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      name,
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = until cancelled
          pricing_scheme: { fixed_price: { value: priceUsd.toFixed(2), currency_code: 'USD' } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CANCEL',
        payment_failure_threshold: 1,
      },
    }),
  })
  if (!res.ok) throw new Error(`Create plan failed: ${await res.text()}`)
  return (await res.json()).id as string
}

/** One-time: create the product + both monthly plans (standard + ACCM). */
export async function createMonthlyPlans(standardUsd: number, accmUsd: number) {
  const token = await getAccessToken()
  const productId = await createProduct(token)
  const standardPlanId = await createPlan(token, productId, standardUsd, `GHT Community — Monthly ($${standardUsd})`)
  const accmPlanId = await createPlan(token, productId, accmUsd, `GHT Community — ACCM ($${accmUsd})`)
  return { productId, standardPlanId, accmPlanId }
}
