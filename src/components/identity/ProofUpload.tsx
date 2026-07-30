'use client'
import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Clock, Loader2, ShieldAlert, Upload, X } from 'lucide-react'
import { uploadToBlob, validateImage, friendlyUploadError } from '@/lib/upload'
import { PROOF_REQUIRED } from '@/lib/identity'

/**
 * Proof-of-account upload: a screenshot of the member's ACCM account.
 *
 * `autoVerify` members (everyone who registered since self-verification shipped)
 * are verified the instant this uploads — no coach in between — so the wording
 * has to promise that rather than "we'll get back to you". Older accounts still
 * queue for staff, and their image is deleted the moment staff decides.
 *
 * The screenshot is worthless unless the ACCM account number is legible in it,
 * and a cropped number is by far the most common reason one gets thrown out. So
 * the member previews their own picture against a checklist and has to confirm
 * the number is visible before it uploads. That tap matters more now, not less:
 * with no coach reading it first, the checklist is the only thing standing
 * between a useless screenshot and a verified account.
 */
export function ProofUpload({ status, rejectReason, accmNumber, autoVerify = false, onSubmitted }: {
  status: string
  rejectReason?: string | null
  accmNumber?: string | null
  autoVerify?: boolean
  onSubmitted: (status: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Object URLs live until revoked. Cleanup only — the URL itself is created in
  // the change handler, where it belongs.
  useEffect(() => {
    if (!picked) return
    return () => URL.revokeObjectURL(picked.url)
  }, [picked])

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''  // let the same file be re-picked after an error
    if (!file) return

    const invalid = validateImage(file)
    if (invalid) { setError(invalid); return }

    setError(null)
    setConfirmed(false)
    setPicked({ file, url: URL.createObjectURL(file) })
  }

  function clear() {
    setPicked(null)
    setConfirmed(false)
    setError(null)
  }

  async function submit() {
    if (!picked || !confirmed) return
    setBusy(true)
    setError(null)
    try {
      const { url } = await uploadToBlob(picked.file)
      const res = await fetch('/api/me/accm-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) throw new Error(d?.error || 'Could not submit your screenshot. Please try again.')
      clear()
      onSubmitted(d.accmVerifyStatus)
    } catch (err) {
      setError(err instanceof Error && !/fetch|network/i.test(err.message) ? err.message : friendlyUploadError(err))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-green-500/30 bg-green-500/5 px-3.5 py-3">
        <BadgeCheck className="w-5 h-5 text-green-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-ink">Account verified</p>
          <p className="text-[11px] text-ink3">
            {autoVerify
              ? 'Your ACCM screenshot checked out — you have full access.'
              : 'Your ACCM account has been confirmed by the team.'}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3.5 py-3">
        <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-ink">Waiting for review</p>
          <p className="text-[11px] text-ink3">A coach or admin will check your screenshot shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-elevated px-3.5 py-3">
      {status === 'rejected' && (
        <div className="flex items-start gap-2 mb-2.5">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400 leading-relaxed">
            <span className="font-bold">Not accepted:</span> {rejectReason || 'Please upload a clearer screenshot.'}
          </p>
        </div>
      )}
      <p className="text-xs font-bold text-ink">
        Verify your ACCM account {PROOF_REQUIRED && <span className="text-red-500">· Required</span>}
      </p>

      {/* Exactly what has to be legible in the picture. */}
      <p className="mt-1.5 text-[11px] text-ink3 leading-relaxed">Your screenshot must clearly show:</p>
      <ul className="mt-1 space-y-1 text-[11px] text-ink2">
        <li className="flex items-start gap-1.5">
          <span className="text-yellow-500 font-bold leading-none mt-0.5">•</span>
          Your <span className="font-semibold text-ink">ACCM account number</span>
          {accmNumber && (
            <span className="font-mono font-bold text-yellow-500">— {accmNumber}</span>
          )}
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-yellow-500 font-bold leading-none mt-0.5">•</span>
          Your <span className="font-semibold text-ink">name</span> on the account
        </li>
      </ul>
      <p className="mt-1.5 text-[11px] text-ink3 leading-relaxed">
        Cover your balance if you prefer — we only check the name and the number.
        {autoVerify && ' Send it and you’re in straight away — no waiting on a coach.'}
      </p>

      <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />

      {!picked ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold border border-line hover:border-yellow-500/50 text-ink2 hover:text-yellow-500 rounded-lg px-3 py-2 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Choose screenshot
        </button>
      ) : (
        <div className="mt-2.5 space-y-2.5">
          {/* Their own picture, big enough to actually read the number in. */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, never a remote URL */}
            <img src={picked.url} alt="Your screenshot" className="w-full max-h-64 object-contain rounded-lg border border-line bg-app" />
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              aria-label="Remove screenshot"
              className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-black/70 text-white hover:bg-black/90 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => { setConfirmed(e.target.checked); setError(null) }}
              disabled={busy}
              className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500"
            />
            <span className="text-[11px] text-ink2 leading-relaxed">
              I can read my ACCM number
              {accmNumber && <span className="font-mono font-bold text-yellow-500"> {accmNumber}</span>}
              {' '}and my name in this picture.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="text-xs font-bold border border-line hover:border-yellow-500/50 text-ink2 hover:text-yellow-500 disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !confirmed}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black rounded-lg px-3 py-2 transition-colors"
            >
              {busy
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Upload className="w-3.5 h-3.5" /> {autoVerify ? 'Verify my account' : 'Send for review'}</>}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] font-semibold text-red-500">{error}</p>}
    </div>
  )
}
