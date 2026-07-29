'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Fingerprint, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { biometricsAvailable, registerPasskey } from '@/lib/passkey'

const DISMISSED_KEY = 'ght:passkeyPromptDismissed'

/**
 * Offers Face ID / Touch ID sign-in once a member's ACCM account is verified.
 *
 * Optional by design — it can be dismissed and never blocks anything. Requiring
 * it would lock out anyone on a desktop without Windows Hello or an older
 * Android, and there's no support path for that.
 *
 * Only shown when: verified, no passkey enrolled yet, the device actually has a
 * biometric sensor, and they haven't waved it away before.
 */
export function PasskeyPrompt() {
  const { status } = useSession()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    let alive = true
    ;(async () => {
      // Cheapest check first — most desktops bail out here without a fetch.
      if (!(await biometricsAvailable()) || !alive) return

      const [me, keys] = await Promise.all([
        fetch('/api/me/identity').then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/me/passkeys').then(r => (r.ok ? r.json() : null)).catch(() => null),
      ])
      if (!alive || !me || !Array.isArray(keys)) return

      // Verified members only — this is the reward for finishing verification,
      // and it keeps the prompt away from anyone still mid-setup.
      if (me.accmVerifyStatus !== 'verified') return
      if (keys.length > 0) return

      setShow(true)
    })()
    return () => { alive = false }
  }, [status])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function enable() {
    setBusy(true)
    setError(null)
    const res = await registerPasskey()
    setBusy(false)

    if (res.ok) {
      localStorage.setItem(DISMISSED_KEY, '1')   // never ask again on this device
      setDone(res.name ?? 'this device')
      return
    }
    // A cancelled Face ID sheet is a decision, not a failure — don't scold them.
    if (res.cancelled) return
    setError(res.error)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl border border-line overflow-hidden">
        <div className="bg-linear-to-br from-yellow-500/15 to-yellow-600/5 px-6 pt-8 pb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 grid place-items-center mb-3">
            {done
              ? <ShieldCheck className="w-7 h-7 text-green-500" />
              : <Fingerprint className="w-7 h-7 text-yellow-500" />}
          </div>
          <h2 className="text-lg font-black text-ink">
            {done ? 'Face ID is on' : 'Skip the password next time'}
          </h2>
        </div>

        <div className="px-6 py-5">
          {done ? (
            <>
              <p className="text-sm text-ink2 leading-relaxed text-center">
                Next time you sign in on {done}, just use Face ID — no password to type or remember.
              </p>
              <button
                onClick={() => setShow(false)}
                className="mt-5 w-full text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg py-2.5 transition-colors"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink2 leading-relaxed text-center">
                Your account is verified. Turn on Face ID and you can sign back in with a
                glance instead of your password.
              </p>

              <ul className="mt-4 space-y-2">
                {[
                  { icon: Zap, text: 'One tap to sign in — nothing to type' },
                  { icon: ShieldCheck, text: 'Your face and fingerprint never leave your device' },
                  { icon: Fingerprint, text: 'Works even if you forget your password' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-ink2 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>

              {error && <p className="mt-3 text-xs font-semibold text-red-500 text-center">{error}</p>}

              <button
                onClick={enable}
                disabled={busy}
                className="mt-5 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black rounded-lg py-2.5 transition-colors"
              >
                {busy
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
                  : <><Fingerprint className="w-4 h-4" /> Turn on Face ID</>}
              </button>
              <button
                onClick={dismiss}
                disabled={busy}
                className="mt-2 w-full text-sm font-semibold text-ink3 hover:text-ink2 py-2 transition-colors disabled:opacity-60"
              >
                Not now
              </button>
              <p className="mt-2 text-center text-[11px] text-ink3">
                You can turn this on later in Settings.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
