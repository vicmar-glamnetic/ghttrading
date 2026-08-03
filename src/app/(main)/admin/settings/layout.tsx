import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Site switches are admin-only. The parent admin layout also lets coaches in
// for user management, so this re-narrows the gate — same as email and courses.
export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
