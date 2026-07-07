import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { paypalConfigured, createMonthlyPlan } from '@/lib/paypal'
import { BILLING } from '@/lib/billing'

// One-time: creates the PayPal product + monthly plan and returns the plan id.
// Set the returned planId as NEXT_PUBLIC_PAYPAL_PLAN_ID. Admin-only.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET first' }, { status: 400 })
  }
  try {
    const { productId, planId } = await createMonthlyPlan(BILLING.priceUsd)
    return NextResponse.json({
      ok: true,
      productId,
      planId,
      next: 'Set NEXT_PUBLIC_PAYPAL_PLAN_ID to this planId (locally + in Vercel), then redeploy.',
    })
  } catch (error) {
    console.error('[PAYPAL_SETUP]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
