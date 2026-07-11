'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { BadgeCheck, Loader2 } from 'lucide-react'

import { ACCM_REGISTER_URL } from '@/lib/billing'

/**
 * Blocking gate shown to ACCM members who haven't recorded their ACCM (AC
 * Capital Market) account number yet. It cannot be dismissed — the member must
 * enter their number before they can use the app. Renders nothing for members
 * who already have a number on file, or for non-ACCM (other-broker) members.
 */
export function AccmNumberGate() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string | null } | undefined)?.role
  const [needs, setNeeds] = useState(false)   // true once we know the number is missing
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check the live profile (session JWT can lag) to decide whether to prompt.
  useEffect(() => {
    if (status !== 'authenticated') return
    if (role === 'admin' || role === 'coach') return   // staff are never gated
    let alive = true
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d) return
        // Only ACCM members are required to provide a number.
        if (d.accmMember !== false && !d.accmNumber) setNeeds(true)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [status, role])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const num = value.trim()
    if (!num) { setError('Please enter your ACCM account number.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accmNumber: num }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || 'Something went wrong. Please try again.')
      }
      setNeeds(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!needs) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line overflow-hidden">
        {/* Header */}
        <div className="relative bg-linear-to-br from-yellow-500/15 to-yellow-600/5 px-6 pt-8 pb-6 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-red-500 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-0.5 mb-3">
            Action required
          </span>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 grid place-items-center mb-3">
            <BadgeCheck className="w-7 h-7 text-yellow-500" />
          </div>
          <h2 className="text-lg font-black text-ink">Enter your ACCM number</h2>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="px-6 py-5">
          <p className="text-sm text-ink2 leading-relaxed text-center">
            To keep using Gold Heist Trading, please enter your ACCM (AC Capital Market)
            account number. We use it to verify your membership — you only need to do this once.
          </p>

          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={e => { setValue(e.target.value); setError(null) }}
            placeholder="e.g. 1234567"
            className="mt-4 w-full text-sm bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-ink placeholder:text-ink3 focus:outline-none focus:border-yellow-500/50"
          />

          {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black rounded-lg py-2.5 transition-colors"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save & continue'}
          </button>

          <p className="mt-4 text-center text-xs text-ink3">
            Don&apos;t have an ACCM account yet?{' '}
            <a href={ACCM_REGISTER_URL} target="_blank" rel="noopener" className="font-semibold text-yellow-500 hover:underline">
              Register here
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
