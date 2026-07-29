import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Coaches + admins only.
export default async function VerificationsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'admin' && role !== 'coach') redirect('/')
  return <>{children}</>
}
