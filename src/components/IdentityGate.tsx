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
/** How often a member waiting on review re-checks whether they've been approved. */
const APPROVAL_POLL_MS = 30 * 1000

export function IdentityGate() {
  const { status, update } = useSession()
  const [state, setState] = useState<IdentityState | null>(null)
  const [step, setStep] = useState<'details' | 'proof'>('details')
  // Bumped when the member self-verifies, to re-run the check immediately
  // instead of leaving them staring at the gate until the next poll.
  const [recheck, setRecheck] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') return
    let alive = true
    // A re-check only ever happens after the member was blocked and just cleared
    // it themselves, so the JWT is stale for certain — say so, or this fresh run
    // would clear the gate without refreshing the token.
    let wasBlocked = recheck > 0
    let settled = false   // verified or never gated — nothing left to wait for

    // The session JWT lags the DB by up to 5 minutes, so ask the server what's
    // actually outstanding rather than trusting the token.
    const check = async () => {
      const d = await fetch('/api/me/identity')
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
      if (!alive || !d) return

      if (!d.gated || !d.needsVerification) {
        // Just approved: refresh the JWT too, or the edge middleware would keep
        // rejecting their posts for up to 5 more minutes.
        if (wasBlocked) update()
        setState(null)
        settled = true
        return
      }
      wasBlocked = true
      setStep(d.complete ? 'proof' : 'details')
      setState(d as IdentityState)
    }

    check()
    // While they're sitting on "waiting for review", poll so the block lifts on
    // its own the moment a coach approves — without this they'd stare at a dead
    // screen until they thought to refresh. Stops as soon as they're through, so
    // a verified member polls once per page load and never again.
    const timer = setInterval(() => {
      if (settled) clearInterval(timer)
      else check()
    }, APPROVAL_POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [status, update, recheck])

  if (!state) return null

  const showProof = step === 'proof'
  // Nothing dismisses this. With PROOF_REQUIRED on, only a coach approving the
  // member clears it — submitting is not enough. The poll above is what makes
  // that bearable.
  const canDismiss = !PROOF_REQUIRED
  const awaitingReview = state.accmVerifyStatus === 'pending'

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
            {!showProof ? 'Set up your member name'
              : awaitingReview ? 'We’re checking your account'
              : 'Verify your ACCM account'}
          </h2>
          <p className="mt-1.5 text-xs text-ink2 leading-relaxed">
            {!showProof
              ? 'Every ACCM member now shows their name with their ACCM number, so the community knows who they’re trading alongside.'
              : awaitingReview
              ? 'A coach is reviewing your screenshot. This screen clears by itself the moment you’re approved — you don’t need to refresh.'
              : 'Last step — every member verifies their ACCM account before using the community.'}
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
                autoVerify={state.accmAutoVerify}
                onSubmitted={s => {
                  setState({ ...state, accmVerifyStatus: s })
                  // Self-verified: they're through this instant, so re-check now
                  // and let the gate close rather than making them sit out the
                  // 30s poll behind an already-lifted block.
                  if (s === 'verified') setRecheck(n => n + 1)
                }}
              />
              {canDismiss ? (
                <button
                  type="button"
                  onClick={() => setState(null)}
                  className="mt-4 w-full text-sm font-bold text-ink2 hover:text-ink border border-line rounded-lg py-2.5 transition-colors"
                >
                  I&apos;ll do this later
                </button>
              ) : (
                <p className="mt-4 text-center text-[11px] text-ink3 leading-relaxed">
                  {awaitingReview
                    ? 'Reviews are done by hand, so this can take a little while. Need it sooner? Message a coach.'
                    : 'You’ll get access once a coach approves your screenshot. Stuck? Message a coach and they can sort it out for you.'}
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
