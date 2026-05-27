'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      const result = await signIn('credentials', { email: formData.email, password: formData.password, redirect: false })
      if (result?.ok) router.push('/')
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
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <img src="/logo.png" alt="GHT Trading" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-black text-white">Join <span className="text-yellow-500">GHT</span></h1>
          <p className="text-[#9090a8] mt-2 text-sm">Free access to premium gold signals</p>
        </div>

        <div className="bg-[#16161f] rounded-2xl border border-[#2a2a3a] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>
            )}
            {[
              { field: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { field: 'email', label: 'Email', type: 'email', placeholder: 'trader@example.com' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">{label}</label>
                <input type={type} value={formData[field as keyof typeof formData]}
                  onChange={e => update(field, e.target.value)} placeholder={placeholder} required
                  className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={formData.password}
                  onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" required
                  className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 pr-10 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a72] hover:text-[#9090a8] transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Confirm Password</label>
              <input type="password" value={formData.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" required
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-4 py-3 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
              />
            </div>
            <Button type="submit" variant="gold" loading={loading} className="w-full py-3 text-base">
              Create Free Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#5a5a72] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-yellow-500 font-semibold hover:text-yellow-400 transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
