import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { LogoutButton } from '@/app/upgrade/LogoutButton'
import { PendingVerification } from '@/components/identity/PendingVerification'
import { Hourglass } from 'lucide-react'

export const metadata = { title: 'Pending Approval · Gold Heist Trading' }

export default async function PendingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.approved !== false) redirect('/')

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
          <Hourglass className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-black text-ink">Account pending approval</h1>
        <p className="text-ink2 text-sm mt-2 leading-relaxed">
          Thanks for signing up{session.user.name ? `, ${session.user.name}` : ''}! Your account is being
          reviewed by our team. You&apos;ll get full access once it&apos;s approved — usually within a few hours.
        </p>

        {/* ACCM members do their verification here, before approval, so whoever
            reviews the sign-up has the ACCM number and the screenshot in front
            of them. Other-broker members have nothing to prove, so they just get
            the wait. */}
        {session.user.accmMember === false ? (
          <div className="bg-surface border border-line rounded-2xl p-5 mt-6 text-left">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">While you wait</p>
            <p className="text-sm text-ink2">
              Your 3-day free trial starts as soon as you&apos;re approved. Questions? Reach out to our team.
            </p>
          </div>
        ) : (
          <PendingVerification />
        )}

        <p className="text-[11px] text-ink3 mt-4">Already approved? Log out and back in to refresh your access.</p>
        <div className="flex items-center justify-between mt-3 px-1">
          <LogoutButton />
          <Link href="/" className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            Check again →
          </Link>
        </div>
      </div>
    </div>
  )
}
