import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Billing setup, migrations and bulk email/deletes are admin-only — the parent
// admin layout also lets coaches in for user management, so this re-narrows it.
export default async function AdminToolsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
