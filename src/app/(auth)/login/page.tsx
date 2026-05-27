'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="bg-[#16161f] rounded-2xl border border-[#2a2a3a] p-8 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="trader@example.com" required
            className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 pr-10 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a72] hover:text-[#9090a8] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" variant="gold" loading={loading} className="w-full py-3 text-base">
          Sign In to Trade
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#2a2a3a]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#16161f] px-3 text-[#5a5a72]">New to GHT?</span>
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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image src="/logo.png" alt="GHT Trading" width={96} height={96} className="mx-auto" priority />
          </div>
          <h1 className="text-3xl font-black text-white">GHT <span className="text-yellow-500">Community</span></h1>
          <p className="text-[#9090a8] mt-2 text-sm">Premium Trading Insights & Gold Signals</p>
        </div>

        <Suspense fallback={
          <div className="bg-[#16161f] rounded-2xl border border-[#2a2a3a] p-8 space-y-4 animate-pulse">
            <div className="h-12 bg-[#1e1e2c] rounded-lg" />
            <div className="h-12 bg-[#1e1e2c] rounded-lg" />
            <div className="h-12 bg-yellow-500/20 rounded-lg" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-[#5a5a72] mt-6">
          <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
        </p>
      </div>
    </div>
  )
}
