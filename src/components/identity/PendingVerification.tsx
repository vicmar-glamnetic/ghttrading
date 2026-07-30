'use client'
import { useEffect, useState } from 'react'
import { BadgeCheck } from 'lucide-react'

import { ACCM_REGISTER_URL } from '@/lib/billing'
import { IdentityForm, type IdentityState } from '@/components/identity/IdentityForm'
import { ProofUpload } from '@/components/identity/ProofUpload'

/**
 * The identity + proof step, shown on /pending while an admin hasn't approved
 * the account yet.
 *
 * Order matters here: an unapproved member never reaches the app, so they never
 * see IdentityGate, so without this the admin on /approvals would be deciding
 * with nothing to go on — no ACCM number, no screenshot. Asking here means the
 * proof is already attached to the sign-up by the time anyone looks at it.
 *
 * Unlike the gate this doesn't block anything (they're blocked already) and
 * can't be "finished" into the app — approval is a separate decision a human
 * still makes. Renders nothing for other-broker members, who have no ACCM
 * account to prove.
 */
export function PendingVerification() {
  const [state, setState] = useState<IdentityState | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/me/identity')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(d => {
        if (!alive) return
        setLoaded(true)
        if (d?.gated) setState(d as IdentityState)
      })
    return () => { alive = false }
  }, [])

  if (!loaded || !state) return null

  const done = state.complete && state.accmVerifyStatus === 'verified'

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 mt-4 text-left">
      <div className="flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 text-yellow-500 shrink-0" />
        <p className="text-sm font-bold text-ink">
          {done ? 'Your ACCM account is verified' : 'Verify your ACCM account while you wait'}
        </p>
      </div>
      <p className="text-xs text-ink2 mt-1.5 leading-relaxed">
        {done
          ? 'Nothing more to do here — the team can see your account details and your screenshot when they review your sign-up.'
          : 'Do this now and the team has everything they need to approve you. Leave it and they’ll be looking at an empty profile.'}
      </p>

      <div className="mt-4 space-y-4">
        {!state.complete ? (
          <IdentityForm
            initial={state}
            submitLabel="Save & continue"
            onSaved={next => setState({ ...state, ...next })}
          />
        ) : (
          <ProofUpload
            status={state.accmVerifyStatus}
            rejectReason={state.accmRejectReason}
            accmNumber={state.accmNumber}
            autoVerify={state.accmAutoVerify}
            onSubmitted={s => setState({ ...state, accmVerifyStatus: s })}
          />
        )}
      </div>

      {!state.complete && (
        <p className="mt-3 text-center text-xs text-ink3">
          Don&apos;t have an ACCM account yet?{' '}
          <a href={ACCM_REGISTER_URL} target="_blank" rel="noopener" className="font-semibold text-yellow-500 hover:underline">
            Register here
          </a>
        </p>
      )}
    </div>
  )
}
