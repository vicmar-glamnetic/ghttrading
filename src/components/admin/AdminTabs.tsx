'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, BookOpen, Mail, GraduationCap, Wrench } from 'lucide-react'

/**
 * Top-level nav for the admin screens. The user table, the mailer and the
 * one-off maintenance tools used to share one page, which pushed the actual
 * member list below several screens of buttons — each is its own tab now.
 */
const TABS = [
  { href: '/admin', label: 'Users', icon: Users, adminOnly: false },
  { href: '/admin/journals', label: 'Journals', icon: BookOpen, adminOnly: false },
  { href: '/admin/email', label: 'Email', icon: Mail, adminOnly: true },
  { href: '/admin/courses', label: 'Courses', icon: GraduationCap, adminOnly: true },
  { href: '/admin/tools', label: 'Tools', icon: Wrench, adminOnly: true },
] as const

export function AdminTabs() {
  const pathname = usePathname()
  const isAdmin = useSession().data?.user?.role === 'admin'
  const tabs = TABS.filter(t => isAdmin || !t.adminOnly)

  return (
    // Scrolls rather than wraps on a phone, so the tab row stays one line and
    // the page below it doesn't shift as tabs come and go.
    <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1 pb-px">
      {tabs.map(({ href, label, icon: Icon }) => {
        // '/admin' would otherwise light up on every child route.
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-ink3 hover:text-ink2'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
