import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Public shell for legal/info pages (Terms, Privacy, Help). Reachable whether
// or not you're signed in — no app chrome, just a readable column.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-app/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="text-yellow-500">GHT</span>
            <span className="text-ink">Trading</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-ink2 hover:text-yellow-500 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink3">
          <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
          <Link href="/help" className="hover:text-yellow-500 transition-colors">Help</Link>
          <span className="ml-auto">© 2026 Gold Heist Trading</span>
        </div>
      </footer>
    </div>
  )
}
