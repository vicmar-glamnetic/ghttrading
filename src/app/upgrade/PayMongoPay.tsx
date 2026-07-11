'use client'
import { useState } from 'react'
import { Wallet } from 'lucide-react'

export function PayMongoPay({ amountPhp }: { amountPhp: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/paymongo/checkout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url // hosted GCash / Maya checkout
        return
      }
      setError(data.error || 'Could not start checkout. Please try again.')
    } catch {
      setError('Could not start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 mt-4">
      <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Pay with GCash or Maya</p>
      <p className="text-xs text-ink3 mb-3">
        ₱{amountPhp.toLocaleString('en-PH')} · instant access · renew monthly
      </p>
      <button
        onClick={pay}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 transition-colors text-white text-sm font-bold py-2.5"
      >
        <Wallet className="w-4 h-4" />
        {loading ? 'Opening checkout…' : 'Pay with GCash / Maya'}
      </button>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <p className="text-[10px] text-ink3 mt-2">
        Secured by PayMongo. Access is granted automatically once your payment is confirmed.
      </p>
    </div>
  )
}
