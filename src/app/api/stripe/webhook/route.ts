import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (err) {
    console.error('[STRIPE_WEBHOOK] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.userId && session.subscription) {
        await db.user.update({
          where: { id: session.metadata.userId },
          data: {
            subscriptionStatus: 'active',
            stripeSubId: session.subscription as string,
          },
        })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.user.updateMany({
        where: { stripeSubId: sub.id },
        data: { subscriptionStatus: 'cancelled', stripeSubId: null },
      })
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId =
        invoice.parent?.type === 'subscription_details'
          ? (invoice.parent.subscription_details?.subscription as string | undefined)
          : undefined
      if (subscriptionId) {
        await db.user.updateMany({
          where: { stripeSubId: subscriptionId },
          data: { subscriptionStatus: 'cancelled' },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
