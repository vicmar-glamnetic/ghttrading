import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSubscription, paypalConfigured } from '@/lib/paypal'

// Called from the /upgrade page right after the buyer approves the subscription,
// so access flips immediately. The webhook is the source of truth for renewals
// and cancellations afterwards.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!paypalConfigured()) return NextResponse.json({ error: 'PayPal not configured' }, { status: 400 })

    const { subscriptionId } = await req.json()
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

    const sub = await getSubscription(subscriptionId)

    // The subscription must belong to this user (custom_id set at creation time).
    if (sub.custom_id && sub.custom_id !== session.user.id) {
      return NextResponse.json({ error: 'Subscription does not belong to you' }, { status: 403 })
    }

    if (!['ACTIVE', 'APPROVED'].includes(sub.status)) {
      return NextResponse.json({ ok: false, status: sub.status })
    }

    const nextBilling = sub.billing_info?.next_billing_time
    await db.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: 'active',
        paypalSubscriptionId: subscriptionId,
        subscriptionEnd: nextBilling ? new Date(nextBilling) : null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PAYPAL_ACTIVATE]', error)
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
