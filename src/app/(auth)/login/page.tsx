'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

// useSearchParams must live in a child component wrapped in <Suspense>
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="bg-white rounded-2xl shadow-md p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" loading={loading} className="w-full py-3 text-base">
          Log in
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">or</span>
        </div>
      </div>

      <Link href="/register">
        <Button variant="secondary" className="w-full py-3 text-base bg-green-500 hover:bg-green-600 text-white">
          Create new account
        </Button>
      </Link>
    </div>
  )
}

// Page shell has no dynamic hooks — pre-renders fine.
// Suspense lets Next.js defer the useSearchParams boundary.
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-white font-bold text-3xl">G</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-600">GHT Community</h1>
          <p className="text-gray-600 mt-1">Connect with your community</p>
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-md p-8 space-y-4 animate-pulse">
            <div className="h-12 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-blue-100 rounded-lg" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
