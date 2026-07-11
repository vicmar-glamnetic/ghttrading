import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/paymongo'
import { PAYMONGO } from '@/lib/billing'

// PayMongo → us. Fires when a GCash / Maya checkout is paid, which grants the
// user PAYMONGO.accessDays of access. Register this URL as a webhook in the
// PayMongo dashboard for the `checkout_session.payment.paid` event and set
// PAYMONGO_WEBHOOK_SECRET to the returned secret.
export async function POST(req: Request) {
  try {
    const raw = await req.text()
    const valid = verifyWebhookSignature(raw, req.headers.get('paymongo-signature'))
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

    const body = JSON.parse(raw)
    const eventType: string = body?.data?.attributes?.type
    const resource = body?.data?.attributes?.data // the checkout session

    if (eventType === 'checkout_session.payment.paid') {
      const attrs = resource?.attributes ?? {}
      const userId: string | undefined = attrs.metadata?.userId || attrs.reference_number
      if (userId) {
        const end = new Date(Date.now() + PAYMONGO.accessDays * 24 * 60 * 60 * 1000)
        await db.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionEnd: end,
            paymentRef: resource?.id ?? null,
          },
        }).catch(() => {})
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[PAYMONGO_WEBHOOK]', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
