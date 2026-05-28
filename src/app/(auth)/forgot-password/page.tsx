'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="GHT Trading" width={80} height={80} className="mx-auto" />
          </div>
          <h1 className="text-3xl font-black text-white">GHT <span className="text-yellow-500">Community</span></h1>
        </div>

        <div className="bg-[#16161f] rounded-2xl border border-[#2a2a3a] p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-lg font-bold text-[#f0f0f8]">Check your inbox</h2>
              <p className="text-sm text-[#9090a8] leading-relaxed">
                If an account with <strong className="text-[#f0f0f8]">{email}</strong> exists, we&apos;ve sent a password reset link. Check your spam folder if you don&apos;t see it.
              </p>
              <p className="text-xs text-[#5a5a72]">The link expires in 1 hour.</p>
              <Link href="/login">
                <Button variant="gold" className="w-full mt-2">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#f0f0f8] mb-1">Forgot your password?</h2>
              <p className="text-sm text-[#9090a8] mb-6 leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    required
                    className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
                  />
                </div>
                <Button type="submit" variant="gold" loading={loading} className="w-full py-3">
                  Send Reset Link
                </Button>
              </form>

              <Link href="/login" className="flex items-center justify-center gap-1.5 mt-5 text-sm text-[#5a5a72] hover:text-yellow-500 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
