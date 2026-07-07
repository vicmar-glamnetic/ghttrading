import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { hasAccess, BILLING } from '@/lib/billing'
import { LogoutButton } from './LogoutButton'
import { Crown, Check } from 'lucide-react'

export const metadata = { title: 'Upgrade · GHT Trading' }

export default async function UpgradePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // Already a member (or paywall off) — no need to be here.
  if (hasAccess(session.user)) redirect('/')

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
            <span className="text-yellow-500 font-bold">${BILLING.priceUsd}/month</span>
            {' '}(₱{BILLING.pricePhp}).
          </p>
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

        {/* payment instructions */}
        <div className="bg-surface border border-line rounded-2xl p-5">
          <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">How to pay</p>
          <ol className="space-y-3 text-sm text-ink">
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-elevated text-ink2 text-xs font-bold flex items-center justify-center">1</span>
              <div>
                Send <span className="font-bold text-yellow-500">₱{BILLING.pricePhp}</span> via GCash to:
                <div className="mt-1.5 rounded-lg bg-sunken border border-line px-3 py-2">
                  <p className="font-mono text-ink font-semibold">{BILLING.gcashNumber}</p>
                  <p className="text-xs text-ink3">{BILLING.gcashName}</p>
                </div>
                {BILLING.mayaNumber && (
                  <p className="text-xs text-ink3 mt-1.5">Maya: <span className="font-mono text-ink2">{BILLING.mayaNumber}</span></p>
                )}
              </div>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-elevated text-ink2 text-xs font-bold flex items-center justify-center">2</span>
              <div>
                Send your payment screenshot and the email <span className="font-semibold text-ink">{session.user.email}</span> to {BILLING.proofContact}.
              </div>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-elevated text-ink2 text-xs font-bold flex items-center justify-center">3</span>
              <div>We activate your account — usually within a few hours. Refresh this page once confirmed.</div>
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-between mt-5 px-1">
          <LogoutButton />
          <Link href="/" className="text-xs text-ink3 hover:text-ink transition-colors">Refresh / I&apos;ve paid</Link>
        </div>
      </div>
    </div>
  )
}
