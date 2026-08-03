import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Mailing members stays admin-only. The parent admin layout also lets coaches
// in for user management, so this re-narrows the gate — same as courses.
export default async function AdminEmailLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
