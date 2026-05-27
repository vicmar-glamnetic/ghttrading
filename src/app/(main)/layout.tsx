import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Navbar } from '@/components/layout/Navbar'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { SessionGuard } from '@/components/SessionGuard'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <SessionGuard />
      <Navbar />
      <div className="max-w-7xl mx-auto pt-14 px-4">
        <div className="flex gap-5 py-5">
          <LeftSidebar />
          <main className="flex-1 min-w-0 max-w-2xl mx-auto space-y-4">{children}</main>
          <RightSidebar />
        </div>
      </div>
    </div>
  )
}
