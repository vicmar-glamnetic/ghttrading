'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, Fingerprint } from 'lucide-react'
import { biometricsAvailable, loginWithPasskey } from '@/lib/passkey'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [canBiometric, setCanBiometric] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const sessionReplaced = searchParams.get('reason') === 'session_replaced'
  const justVerified = searchParams.get('verified') === '1'

  useEffect(() => {
    biometricsAvailable().then(setCanBiometric).catch(() => {})
  }, [])

  async function handlePasskey() {
    setPasskeyBusy(true)
    setError('')
    const res = await loginWithPasskey(callbackUrl)
    setPasskeyBusy(false)

    if (res.ok) {
      router.push(callbackUrl)
      router.refresh()
      return
    }
    // Dismissing the Face ID sheet isn't an error worth shouting about.
    if (res.cancelled) return
    setError(res.error)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 20000)
      )
      const result = await Promise.race([
        signIn('credentials', { email, password, rememberMe: String(rememberMe), redirect: false }),
        timeout,
      ])
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'timeout') {
        setError('Server is taking too long to respond. Please try again in a moment.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-8 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {justVerified && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm">
            Email verified! You can now sign in.
          </div>
        )}
        {sessionReplaced && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg p-3 text-sm">
            You were signed out because your account was logged in on another device.
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
            {error}{' '}
            <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="underline hover:text-red-300">Need to verify your email?</Link>
          </div>
        )}
        <div>
          <label htmlFor="login-email" className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Email</label>
          {/* name + autoComplete are what make iOS/Android offer to save this
              login and then Face ID-autofill it next time. Without them the
              password manager mostly ignores the form. */}
          <input
            id="login-email" name="email" type="email" autoComplete="username"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="trader@example.com" required
            className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-ink placeholder-ink3 transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-ink2 uppercase tracking-wider">Password</label>
            <Link href="/forgot-password" className="text-xs text-ink3 hover:text-yellow-500 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password" name="password" autoComplete="current-password"
              type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-4 py-3 pr-10 text-sm outline-none text-ink placeholder-ink3 transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-line bg-elevated accent-yellow-500 cursor-pointer"
          />
          <span className="text-sm text-ink2">Remember me for 30 days</span>
        </label>
        <Button type="submit" variant="gold" loading={loading} className="w-full py-3 text-base">
          Sign In to Trade
        </Button>
      </form>

      {/* Only rendered once we know the device has a biometric sensor — offering
          Face ID on a machine that can't do it is just a dead button. */}
      {canBiometric && (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-ink3">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasskey}
            disabled={passkeyBusy || loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold border border-line hover:border-yellow-500/50 text-ink hover:text-yellow-500 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Fingerprint className="w-4 h-4" />
            {passkeyBusy ? 'Waiting for Face ID…' : 'Sign in with Face ID'}
          </button>
        </>
      )}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-3 text-ink3">New to GHT?</span>
        </div>
      </div>

      <Link href="/register">
        <Button variant="secondary" className="w-full py-3 text-sm">
          Create Free Account
        </Button>
      </Link>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gold Heist Trading" width={96} height={96} className="mx-auto" />
          </div>
          <h1 className="text-3xl font-black text-ink">GHT <span className="text-yellow-500">Community</span></h1>
          <p className="text-ink2 mt-2 text-sm">Premium Trading Insights & Gold Signals</p>
        </div>

        <Suspense fallback={
          <div className="bg-surface rounded-2xl border border-line p-8 space-y-4 animate-pulse">
            <div className="h-12 bg-elevated rounded-lg" />
            <div className="h-12 bg-elevated rounded-lg" />
            <div className="h-12 bg-yellow-500/20 rounded-lg" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-ink3 mt-6">
          <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
        </p>
      </div>
    </div>
  )
}
