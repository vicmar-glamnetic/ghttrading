import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Course admin stays admin-only — the parent admin layout now also lets coaches
// in for user management, so this re-narrows the gate.
export default async function AdminCoursesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
