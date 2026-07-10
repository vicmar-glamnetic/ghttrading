import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasAccess, BILLING, PAYPAL, CRYPTO, tierFor, canSubscribe, getPricePhp, ACCM_REGISTER_URL } from '@/lib/billing'
import { LogoutButton } from './LogoutButton'
import { PayPalSubscribe } from './PayPalSubscribe'
import { CryptoPay } from './CryptoPay'
import { Crown, Check, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Upgrade · Gold Heist Trading' }

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
            Unlock the full Gold Heist Trading community for{' '}
            <span className="text-yellow-500 font-bold">${tier.usd}/month</span>
            {' '}(≈ ₱{php.toLocaleString('en-PH')} today).
          </p>
          <p className="text-[11px] text-ink3 mt-1">Your free trial has ended — pick an option below to keep full access.</p>
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

        {/* Free path — open an ACCM account under our partner link */}
        <div className="bg-surface border border-green-500/30 rounded-2xl p-5 mb-4">
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">Free option</p>
          <p className="text-sm text-ink font-semibold">Trade with AC Capital Market</p>
          <p className="text-xs text-ink3 mt-1 mb-3">
            Open an ACCM account through our link and the community is free — no subscription, ever.
            Once you&apos;re registered, send your ACCM account number to {BILLING.proofContact} and we&apos;ll unlock your account.
          </p>
          <a
            href={ACCM_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-500 hover:bg-green-400 transition-colors text-black text-sm font-bold py-2.5"
          >
            Register with ACCM
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[10px] font-bold text-ink3 uppercase tracking-wider">or subscribe</span>
          <div className="h-px flex-1 bg-line" />
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
