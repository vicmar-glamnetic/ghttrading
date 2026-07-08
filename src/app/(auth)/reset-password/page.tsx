'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-8 shadow-2xl">
      {success ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h2 className="text-lg font-bold text-ink">Password reset!</h2>
          <p className="text-sm text-ink2">Your password has been updated. Redirecting to sign in…</p>
          <Link href="/login">
            <Button variant="gold" className="w-full mt-2">Sign In Now</Button>
          </Link>
        </div>
      ) : !token ? (
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-ink">Invalid link</h2>
          <p className="text-sm text-ink2">This reset link is invalid or has expired.</p>
          <Link href="/forgot-password">
            <Button variant="gold" className="w-full">Request a new link</Button>
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-bold text-ink mb-1">Choose a new password</h2>
          <p className="text-sm text-ink2 mb-6">Must be at least 8 characters.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-4 py-3 pr-10 text-sm outline-none text-ink placeholder-ink3 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-ink placeholder-ink3 transition-colors"
              />
            </div>
            <Button type="submit" variant="gold" loading={loading} className="w-full py-3">
              Reset Password
            </Button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="GHT Trading" width={80} height={80} className="mx-auto" />
          </div>
          <h1 className="text-3xl font-black text-ink">GHT <span className="text-yellow-500">Community</span></h1>
        </div>

        <Suspense fallback={
          <div className="bg-surface rounded-2xl border border-line p-8 space-y-4 animate-pulse">
            <div className="h-4 w-48 bg-elevated rounded" />
            <div className="h-12 bg-elevated rounded-lg" />
            <div className="h-12 bg-elevated rounded-lg" />
            <div className="h-12 bg-yellow-500/20 rounded-lg" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
