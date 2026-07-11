import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCheckoutSession } from '@/lib/paymongo'
import { paymongoConfigured, tierFor, getPricePhp } from '@/lib/billing'

// Starts a PayMongo (GCash / Maya) checkout for the current user and returns the
// hosted checkout URL. Activation happens later via the webhook once payment lands.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!paymongoConfigured()) return NextResponse.json({ error: 'PayMongo not configured' }, { status: 400 })

    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { accmMember: true, email: true },
    })
    const tier = tierFor(dbUser?.accmMember)
    // ACCM members are free — nothing to charge.
    if (tier.free || tier.usd <= 0) {
      return NextResponse.json({ error: 'Your membership is free — no payment needed.' }, { status: 400 })
    }

    const { php } = await getPricePhp(tier.usd)
    const origin = req.headers.get('origin') || new URL(req.url).origin

    const { id, url } = await createCheckoutSession({
      amountPhp: php,
      description: `Gold Heist Trading — Monthly Membership ($${tier.usd})`,
      userId: session.user.id,
      email: dbUser?.email ?? session.user.email ?? undefined,
      successUrl: `${origin}/upgrade?paid=1`,
      cancelUrl: `${origin}/upgrade`,
    })

    // Record the pending checkout so admins can trace it if the webhook is delayed.
    await db.user.update({
      where: { id: session.user.id },
      data: { subscriptionStatus: 'pending', paymentRef: id },
    }).catch(() => {})

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[PAYMONGO_CHECKOUT]', error)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
