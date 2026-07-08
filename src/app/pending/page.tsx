import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { LogoutButton } from '@/app/upgrade/LogoutButton'
import { Hourglass } from 'lucide-react'

export const metadata = { title: 'Pending Approval · GHT Trading' }

export default async function PendingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { approved: true } })
  if (me?.approved) redirect('/')

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

        <div className="bg-surface border border-line rounded-2xl p-5 mt-6 text-left">
          <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">While you wait</p>
          <p className="text-sm text-ink2">
            Make sure you&apos;ve registered your ACCM trading account — ACCM members get{' '}
            <span className="text-ink font-semibold">free access</span>. Questions? Reach out to our team.
          </p>
        </div>

        <div className="flex items-center justify-between mt-6 px-1">
          <LogoutButton />
          <Link href="/" className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            Check again →
          </Link>
        </div>
      </div>
    </div>
  )
}
