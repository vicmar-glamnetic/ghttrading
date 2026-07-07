import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PAYWALL_ENABLED } from '@/lib/billing'
import { Navbar } from '@/components/layout/Navbar'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { SessionGuard } from '@/components/SessionGuard'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // Per-feature paywall is enforced in middleware (auth.config) for premium paths.

  return (
    <div className="min-h-screen bg-app">
      <SessionGuard />
      <Navbar />
      <div className="w-full pt-14 px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex gap-5 py-5">
          <LeftSidebar paywallEnabled={PAYWALL_ENABLED} />
          <main className="flex-1 min-w-0 max-w-2xl lg:max-w-3xl xl:max-w-5xl 2xl:max-w-7xl mx-auto space-y-4 pb-28 lg:pb-0">{children}</main>
          <RightSidebar />
        </div>
      </div>
      <MobileBottomNav paywallEnabled={PAYWALL_ENABLED} />
    </div>
  )
}
