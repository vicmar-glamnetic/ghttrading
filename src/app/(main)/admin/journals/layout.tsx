import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Journal adoption is admin-only — the parent admin layout also lets coaches in
// for user management, so this re-narrows the gate (same as admin/courses).
export default async function AdminJournalsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
