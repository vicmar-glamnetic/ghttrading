import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PAYWALL_ENABLED } from '@/lib/billing'
import { Navbar } from '@/components/layout/Navbar'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { SessionGuard } from '@/components/SessionGuard'
import { PresenceHeartbeat } from '@/components/PresenceHeartbeat'
import { WelcomeTour } from '@/components/WelcomeTour'
import { IdentityGate } from '@/components/IdentityGate'
import { PasskeyPrompt } from '@/components/identity/PasskeyPrompt'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // New accounts must be approved by an admin before they can enter.
  // Read from the session (no per-navigation DB hit); it refreshes within ~5 min.
  if (session.user.approved === false) redirect('/pending')
  // Per-feature paywall is enforced in middleware (auth.config) for premium paths.

  return (
    <div className="min-h-dvh bg-app">
      <SessionGuard />
      <PresenceHeartbeat />
      <Navbar />
      {/* Icon rail on the left, workspace in the middle, market panel on the
          right (wide desktops only). Phones get the full width plus the tab bar
          and side drawer. */}
      <div className="flex w-full" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
        <LeftSidebar paywallEnabled={PAYWALL_ENABLED} />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-28 md:pb-8">
          <div className="mx-auto max-w-6xl space-y-4">{children}</div>
        </main>
        <RightSidebar />
      </div>
      <MobileBottomNav paywallEnabled={PAYWALL_ENABLED} />
      <WelcomeTour />
      <IdentityGate />
      <PasskeyPrompt />
    </div>
  )
}
