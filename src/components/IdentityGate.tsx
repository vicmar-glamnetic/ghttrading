'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { BadgeCheck } from 'lucide-react'

import { ACCM_REGISTER_URL } from '@/lib/billing'
import { PROOF_REQUIRED } from '@/lib/identity'
import { IdentityForm, type IdentityState } from '@/components/identity/IdentityForm'
import { ProofUpload } from '@/components/identity/ProofUpload'

/**
 * Blocking gate for ACCM members who haven't set up their identity yet. It can't
 * be dismissed: the member must supply a display name in the required
 * "<Name> - <ACCM number>" format, their real name, and their ACCM number.
 *
 * Renders nothing for staff or for other-broker members — they have no ACCM
 * number, so gating them would lock them out of the app (see isGatedMember).
 *
 * Replaces the old AccmNumberGate, which asked for the number alone.
 */
export function IdentityGate() {
  const { status } = useSession()
  const [state, setState] = useState<IdentityState | null>(null)
  const [step, setStep] = useState<'details' | 'proof'>('details')

  useEffect(() => {
    if (status !== 'authenticated') return
    let alive = true
    // The session JWT lags behind the DB, so ask the server what's actually missing.
    fetch('/api/me/identity')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d || !d.gated) return
        if (!d.complete) { setStep('details'); setState(d as IdentityState) }
        // Name already set but proof outstanding (including a rejected upload)
        // — open straight on the upload step rather than re-asking for the name.
        else if (d.needsProof) { setStep('proof'); setState(d as IdentityState) }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [status])

  if (!state) return null

  const showProof = step === 'proof'
  // With PROOF_REQUIRED on, the only way out of the proof step is to submit one.
  // 'pending' counts as submitted — members are unblocked while staff review,
  // otherwise the whole community would sit behind the review queue.
  const proofSubmitted = state.accmVerifyStatus === 'pending' || state.accmVerifyStatus === 'verified'
  const canDismiss = proofSubmitted || !PROOF_REQUIRED

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line overflow-hidden max-h-dvh overflow-y-auto">
        {/* Header */}
        <div className="relative bg-linear-to-br from-yellow-500/15 to-yellow-600/5 px-6 pt-8 pb-6 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-red-500 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-0.5 mb-3">
            Action required
          </span>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 grid place-items-center mb-3">
            <BadgeCheck className="w-7 h-7 text-yellow-500" />
          </div>
          <h2 className="text-lg font-black text-ink">
            {showProof ? 'Verify your ACCM account' : 'Set up your member name'}
          </h2>
          <p className="mt-1.5 text-xs text-ink2 leading-relaxed">
            {showProof
              ? 'Last step — every member verifies their ACCM account. You can carry on as soon as you’ve sent the screenshot.'
              : 'Every ACCM member now shows their name with their ACCM number, so the community knows who they’re trading alongside.'}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {showProof ? (
            <>
              <ProofUpload
                status={state.accmVerifyStatus}
                rejectReason={state.accmRejectReason}
                accmNumber={state.accmNumber}
                onSubmitted={s => setState({ ...state, accmVerifyStatus: s })}
              />
              {canDismiss ? (
                <button
                  type="button"
                  onClick={() => setState(null)}
                  className="mt-4 w-full text-sm font-bold text-ink2 hover:text-ink border border-line rounded-lg py-2.5 transition-colors"
                >
                  {proofSubmitted ? 'Done' : 'I’ll do this later'}
                </button>
              ) : (
                <p className="mt-4 text-center text-[11px] text-ink3 leading-relaxed">
                  A screenshot is required to continue. Stuck? Message a coach and
                  they can sort it out for you.
                </p>
              )}
            </>
          ) : (
            <>
              <IdentityForm
                initial={state}
                submitLabel="Save & continue"
                onSaved={next => { setState({ ...state, ...next }); setStep('proof') }}
              />
              <p className="mt-4 text-center text-xs text-ink3">
                Don&apos;t have an ACCM account yet?{' '}
                <a href={ACCM_REGISTER_URL} target="_blank" rel="noopener" className="font-semibold text-yellow-500 hover:underline">
                  Register here
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
