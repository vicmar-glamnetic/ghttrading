import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhook, getSubscription } from '@/lib/paypal'

// PayPal → us. Keeps subscriptionStatus in sync on renewals, cancellations, etc.
// Configure this URL as a webhook in the PayPal dashboard and set PAYPAL_WEBHOOK_ID.
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const valid = await verifyWebhook(req.headers, body)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

    const type: string = body.event_type
    const resource = body.resource || {}

    if (type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const userId: string | undefined = resource.custom_id
      const end = resource.billing_info?.next_billing_time
      if (userId) {
        await db.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            paypalSubscriptionId: resource.id,
            subscriptionEnd: end ? new Date(end) : null,
          },
        }).catch(() => {})
      }
    } else if (
      type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      type === 'BILLING.SUBSCRIPTION.EXPIRED' ||
      type === 'BILLING.SUBSCRIPTION.SUSPENDED'
    ) {
      if (resource.id) {
        await db.user.updateMany({
          where: { paypalSubscriptionId: resource.id },
          data: { subscriptionStatus: 'canceled' },
        })
      }
    } else if (type === 'PAYMENT.SALE.COMPLETED') {
      // Recurring payment succeeded — extend the access window.
      const subId: string | undefined = resource.billing_agreement_id
      if (subId) {
        try {
          const sub = await getSubscription(subId)
          const end = sub.billing_info?.next_billing_time
          await db.user.updateMany({
            where: { paypalSubscriptionId: subId },
            data: { subscriptionStatus: 'active', subscriptionEnd: end ? new Date(end) : null },
          })
        } catch { /* ignore */ }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[PAYPAL_WEBHOOK]', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
