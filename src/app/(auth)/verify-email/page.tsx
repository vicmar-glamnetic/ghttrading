'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MailCheck } from 'lucide-react'

function VerifyInner() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') || ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    if (code.trim().length !== 6) { setError('Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Verification failed'); return }
      router.push('/login?verified=1')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setError(''); setInfo(''); setResending(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Could not resend code')
      else setInfo('A new code is on its way.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
            <MailCheck className="w-7 h-7 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-black text-white">Verify your email</h1>
          <p className="text-ink2 mt-2 text-sm">
            We sent a 6-digit code to {email ? <span className="text-ink font-semibold">{email}</span> : 'your email'}. Enter it below.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-8 shadow-2xl">
          <form onSubmit={verify} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}
            {info && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm">{info}</div>}
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="••••••"
              autoFocus
              className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-4 py-3 text-center text-2xl font-black tracking-[0.4em] outline-none text-ink placeholder-ink3 transition-colors"
            />
            <Button type="submit" variant="gold" loading={loading} className="w-full py-3 text-base">Verify &amp; continue</Button>
          </form>
          <button onClick={resend} disabled={resending} className="mt-4 w-full text-center text-xs text-ink3 hover:text-yellow-500 transition-colors">
            {resending ? 'Sending…' : "Didn't get it? Resend code"}
          </button>
        </div>

        <p className="text-center text-sm text-ink3 mt-6">
          <Link href="/login" className="text-yellow-500 font-semibold hover:text-yellow-400 transition-colors">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  )
}
