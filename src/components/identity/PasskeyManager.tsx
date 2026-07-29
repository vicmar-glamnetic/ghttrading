'use client'
import { useCallback, useEffect, useState } from 'react'
import { Fingerprint, Loader2, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { biometricsAvailable, registerPasskey } from '@/lib/passkey'

interface Passkey {
  id: string
  name: string | null
  createdAt: string
  lastUsedAt: string | null
}

/** Add and remove the devices that can sign in with Face ID / Touch ID. */
export function PasskeyManager() {
  const [keys, setKeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [canAdd, setCanAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/passkeys')
      const data = await res.json().catch(() => null)
      setKeys(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load().catch(() => {}) }, [load])
  useEffect(() => { biometricsAvailable().then(setCanAdd).catch(() => {}) }, [])

  async function add() {
    setBusy(true)
    setError(null)
    const res = await registerPasskey()
    setBusy(false)
    if (res.ok) { load(); return }
    if (res.cancelled) return
    setError(res.error)
  }

  async function remove(k: Passkey) {
    if (!confirm(`Remove ${k.name || 'this device'}?\n\nYou'll need your password to sign in on it again.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/me/passkeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: k.id }),
      })
      if (!res.ok) throw new Error('Could not remove that device. Please try again.')
      setKeys(prev => prev.filter(x => x.id !== k.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that device.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
          <Fingerprint className="w-4 h-4 text-yellow-500" /> Face ID &amp; Touch ID
        </h2>
        <p className="text-xs text-ink3 mt-1 leading-relaxed">
          Sign in with your face or fingerprint instead of your password. Your biometrics stay on
          your device — we never see them.
        </p>
      </div>

      {loading ? (
        <div className="h-16 bg-elevated rounded-lg border border-line animate-pulse" />
      ) : keys.length === 0 ? (
        <p className="text-xs text-ink3 italic">No devices set up yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 rounded-lg border border-line bg-elevated px-3 py-2.5">
              <Fingerprint className="w-4 h-4 text-yellow-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">{k.name || 'Unnamed device'}</p>
                <p className="text-[10px] text-ink3">
                  Added {format(new Date(k.createdAt), 'MMM d, yyyy')}
                  {k.lastUsedAt && ` · last used ${format(new Date(k.lastUsedAt), 'MMM d')}`}
                </p>
              </div>
              <button
                onClick={() => remove(k)}
                disabled={busy}
                aria-label={`Remove ${k.name || 'device'}`}
                className="shrink-0 text-ink3 hover:text-red-400 disabled:opacity-50 transition-colors p-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {canAdd ? (
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs font-bold border border-line hover:border-yellow-500/50 text-ink2 hover:text-yellow-500 disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
        >
          {busy
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up…</>
            : <><Plus className="w-3.5 h-3.5" /> {keys.length ? 'Add this device' : 'Turn on Face ID'}</>}
        </button>
      ) : (
        <p className="text-[11px] text-ink3 leading-relaxed">
          This device doesn&apos;t support Face ID or fingerprint sign-in. Try it on your phone —
          each device is set up separately.
        </p>
      )}
    </div>
  )
}
