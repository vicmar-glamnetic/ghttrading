import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { paypalConfigured, createMonthlyPlans } from '@/lib/paypal'
import { BILLING } from '@/lib/billing'

// One-time: creates the PayPal product + both plans (standard + ACCM) and
// returns their plan ids. Admin-only.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET first' }, { status: 400 })
  }
  try {
    const { productId, standardPlanId, accmPlanId } = await createMonthlyPlans(BILLING.priceUsd, BILLING.priceUsdAccm)
    return NextResponse.json({
      ok: true,
      productId,
      standardPlanId,
      accmPlanId,
      next: 'Set NEXT_PUBLIC_PAYPAL_PLAN_ID = standard, NEXT_PUBLIC_PAYPAL_PLAN_ID_ACCM = ACCM (locally + Vercel), then redeploy.',
    })
  } catch (error) {
    console.error('[PAYPAL_SETUP]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
