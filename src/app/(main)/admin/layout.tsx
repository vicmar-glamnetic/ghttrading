import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminTabs } from '@/components/admin/AdminTabs'

// Staff gate. The (main) layout already requires login; this narrows to admins
// and coaches, who share the user-management screen. Admin-only tools live
// behind their own gate (see admin/courses/layout.tsx) or are hidden in the page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = (await auth())?.user?.role
  if (role !== 'admin' && role !== 'coach') redirect('/')
  return (
    <>
      <AdminTabs />
      {children}
    </>
  )
}
