'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal, Mail } from 'lucide-react'

/**
 * Site-wide switches. Unlike /admin/tools — where every button fires a one-off
 * job — these change how the app behaves from the moment they're flipped, and
 * stay flipped until someone changes them back.
 */
export default function AdminSettingsPage() {
  const [signalEmail, setSignalEmail] = useState(false)
  const [recipients, setRecipients] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSignalEmail(Boolean(d.settings?.signalEmailAlerts))
          setRecipients(d.signalEmailRecipients ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleSignalEmail() {
    const next = !signalEmail
    setBusy(true); setMsg('')
    // Optimistic: the switch moves on tap and rolls back if the save fails,
    // so it never sits mid-flip waiting on the round trip.
    setSignalEmail(next)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'signalEmailAlerts', value: next }),
      })
      const d = await res.json()
      if (!res.ok) {
        setSignalEmail(!next)
        setMsg(d.error || 'Could not save that.')
      } else {
        setSignalEmail(Boolean(d.settings?.signalEmailAlerts))
        setMsg(next
          ? '✓ On — the next public signal emails everyone eligible.'
          : '✓ Off — new signals send push notifications only.')
      }
    } catch {
      setSignalEmail(!next)
      setMsg('Could not save that.')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Admin · Settings</h1>
      </div>
      <p className="text-xs text-ink3">
        Site-wide switches. A change takes effect immediately — no redeploy needed.
      </p>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-yellow-500" /> Email everyone on a new signal
            </p>
            <p className="text-xs text-ink3 mt-1">
              When a coach publishes a public signal, email the pair, the direction and the entry zone —
              never the stop, the targets, the chart or the notes. Those stay behind the login, and the
              email&rsquo;s only button is &ldquo;log in to view the full setup&rdquo;.
            </p>
            <p className="text-xs text-ink3 mt-2">
              Goes to <span className="font-semibold text-ink2">coaches</span>,{' '}
              <span className="font-semibold text-ink2">verified ACCM members</span> and{' '}
              <span className="font-semibold text-ink2">non-ACCM members with active access</span> (paid,
              comped or still in trial). Unverified, rejected and lapsed accounts are skipped.
              {recipients !== null && (
                <> <span className="font-semibold text-ink2">{recipients}</span> would be emailed right now.</>
              )}
            </p>
            <p className="text-xs text-ink3 mt-2">
              Push notifications go out either way — this only adds the email for members who never turned push on.
            </p>
          </div>
          <button
            onClick={toggleSignalEmail}
            disabled={loading || busy}
            role="switch"
            aria-checked={signalEmail}
            aria-label="Toggle new-signal emails"
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${signalEmail ? 'bg-yellow-500' : 'bg-line2'} disabled:opacity-50`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${signalEmail ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {msg && <p className="text-xs text-ink2 mt-3">{msg}</p>}
      </div>
    </div>
  )
}
