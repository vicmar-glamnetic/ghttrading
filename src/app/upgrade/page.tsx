import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasAccess, BILLING, PAYPAL, CRYPTO, tierFor, canSubscribe, getPricePhp } from '@/lib/billing'
import { LogoutButton } from './LogoutButton'
import { PayPalSubscribe } from './PayPalSubscribe'
import { CryptoPay } from './CryptoPay'
import { Crown, Check } from 'lucide-react'

export const metadata = { title: 'Upgrade · GHT Trading' }

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // Admins can preview the page (to test the PayPal flow) via ?preview=1,
  // even while the paywall is off.
  const { preview } = await searchParams
  const previewing = preview === '1' && session.user.role === 'admin'
  // Already a member (or paywall off) — no need to be here.
  if (!previewing && hasAccess(session.user)) redirect('/')

  // Pick the price tier: everyone is ACCM ($1.99) unless an admin switched them.
  const dbUser = await db.user.findUnique({ where: { id: session.user.id }, select: { accmMember: true } })
  const tier = tierFor(dbUser?.accmMember)
  const { php } = await getPricePhp(tier.usd)
  const subscribable = canSubscribe(tier.planId)

  const perks = [
    'Live trading signals & market analysis',
    'Trade ideas you can copy straight to MT5',
    'TradingView charts, P&L journal & calendar',
    'Community feed, groups & coaching',
  ]

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
            <Crown className="w-7 h-7 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-black text-ink">Become a Member</h1>
          <p className="text-ink2 text-sm mt-1">
            Unlock the full GHT Trading community for{' '}
            <span className="text-yellow-500 font-bold">${tier.usd}/month</span>
            {' '}(≈ ₱{php.toLocaleString('en-PH')} today).
          </p>
          {tier.label === 'ACCM' && (
            <p className="text-[11px] text-green-400 mt-1">🎉 ACCM member price applied</p>
          )}
        </div>

        {/* perks */}
        <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
          <ul className="space-y-2.5">
            {perks.map(p => (
              <li key={p} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span className="text-sm text-ink">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* PayPal — instant recurring subscription */}
        {subscribable && (
          <div className="bg-surface border border-line rounded-2xl p-5">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Subscribe with PayPal or card</p>
            <p className="text-xs text-ink3 mb-3">${tier.usd}/month (≈ ₱{php.toLocaleString('en-PH')}) · cancel anytime · instant access</p>
            <PayPalSubscribe clientId={PAYPAL.clientId} planId={tier.planId} userId={session.user.id} />
          </div>
        )}

        {/* Crypto (USDT) — send-to-wallet, then we activate */}
        {CRYPTO.enabled && (
          <CryptoPay amountUsd={tier.usd} email={session.user.email ?? ''} proofContact={BILLING.proofContact} />
        )}

        {!subscribable && !CRYPTO.enabled && (
          <div className="bg-surface border border-line rounded-2xl p-5 text-center">
            <p className="text-sm text-ink2">Payments are being set up. Please check back shortly or contact {BILLING.proofContact}.</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-5 px-1">
          <LogoutButton />
          <Link href="/" className="text-xs text-ink3 hover:text-ink transition-colors">Refresh / I&apos;ve paid</Link>
        </div>
      </div>
    </div>
  )
}
