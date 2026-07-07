import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Admin-only gate. The (main) layout already requires login; this narrows to admins.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')
  return <>{children}</>
}
