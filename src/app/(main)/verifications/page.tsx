'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { BadgeCheck, Check, X, ExternalLink, Clock, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ImageLightbox } from '@/components/ui/ImageLightbox'

/**
 * Two lists, because members now arrive here two different ways.
 *
 * "Waiting for review" is the old queue: accounts that pre-date self-verification
 * are locked out until a coach decides, so this is the one on the critical path.
 *
 * "Verified themselves" is the audit trail: accounts registered since verify
 * themselves off their own ACCM screenshot and are already inside the app. Staff
 * skim the pictures and revoke anything that doesn't hold up.
 */

/**
 * Rejecting locks the member out of the app until they re-upload, and the member
 * reads this text word for word. Canned reasons keep them specific and mean a
 * coach clearing a backlog isn't tempted to type "unclear" fifty times.
 */
const REJECT_REASONS = [
  'Your ACCM account number isn’t visible. Please send a screenshot that includes the part of the screen showing your account number.',
  'The screenshot is too blurry to read. Please send a clearer one.',
  'The account number in the screenshot doesn’t match the ACCM number on your profile. Please check and try again.',
  'The name on the account doesn’t match the real name on your profile. Please check and try again.',
]

interface Submission {
  id: string
  name: string | null
  realName: string | null
  email: string | null
  username: string | null
  image: string | null
  accmNumber: string | null
  accmProofUrl: string | null
  accmProofAt: string | null
  accmVerifiedAt?: string | null
  createdAt: string
}

export default function VerificationsPage() {
  const [pending, setPending] = useState<Submission[]>([])
  const [selfVerified, setSelfVerified] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)  // user id with the reason panel open
  const [customReason, setCustomReason] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/verifications')
      const data = await res.json()
      setPending(Array.isArray(data?.pending) ? data.pending : [])
      setSelfVerified(Array.isArray(data?.selfVerified) ? data.selfVerified : [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function decide(u: Submission, action: 'approve' | 'reject', reason = '') {
    if (action === 'reject' && !reason.trim()) return
    setBusy(u.id)
    try {
      const res = await fetch('/api/staff/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action, reason }),
      })
      if (res.ok) {
        // Decided either way, the row leaves both lists — the screenshot behind
        // it has just been deleted from storage.
        setPending(prev => prev.filter(x => x.id !== u.id))
        setSelfVerified(prev => prev.filter(x => x.id !== u.id))
        setRejecting(null)
      } else {
        const d = await res.json().catch(() => null)
        alert(d?.error || 'Could not save that decision. Please try again.')
      }
    } finally {
      setBusy(null)
    }
  }

  const cardProps = { busy, zoom: setZoom, decide, rejecting, setRejecting, customReason, setCustomReason }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">ACCM verifications</h1>
        {!loading && (
          <span className="ml-auto text-xs text-ink3 bg-surface border border-line rounded-full px-3 py-1">
            {pending.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
      ) : (
        <>
          {/* The queue. These members can't use the app until someone decides. */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-yellow-500" />
              <h2 className="text-sm font-bold text-ink">Waiting for review</h2>
            </div>
            <p className="text-[11px] text-ink3 -mt-1">
              Older accounts, locked out until you decide. New sign-ups don&apos;t come through here — they verify
              themselves from their screenshot.
            </p>
            {pending.length === 0 ? (
              <div className="bg-surface rounded-xl border border-line p-10 text-center">
                <BadgeCheck className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
                <p className="text-ink3">Nothing waiting for review — you&apos;re all caught up. 🎉</p>
              </div>
            ) : (
              pending.map(u => <SubmissionCard key={u.id} u={u} kind="pending" {...cardProps} />)
            )}
          </section>

          {/* The audit trail. Nobody here is blocked; this is a spot-check. */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-bold text-ink">Verified themselves</h2>
              {selfVerified.length > 0 && (
                <span className="text-[10px] text-ink3 bg-surface border border-line rounded-full px-2 py-0.5">
                  {selfVerified.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink3 -mt-1">
              New sign-ups, already in the app. Nothing here needs doing — check a screenshot if you want, then
              &ldquo;Looks right&rdquo; to file it away or &ldquo;Revoke&rdquo; to put them back behind the gate.
            </p>
            {selfVerified.length === 0 ? (
              <div className="bg-surface rounded-xl border border-line p-8 text-center">
                <p className="text-xs text-ink3">No new sign-ups to spot-check.</p>
              </div>
            ) : (
              selfVerified.map(u => <SubmissionCard key={u.id} u={u} kind="self" {...cardProps} />)
            )}
          </section>
        </>
      )}

      <p className="text-[10px] text-ink3 text-center">
        The screenshot is deleted from storage as soon as you decide either way.
      </p>

      {zoom && <ImageLightbox images={[zoom]} startIndex={0} onClose={() => setZoom(null)} />}
    </div>
  )
}

/**
 * One submission: who they say they are, the picture, and the two buttons.
 * Lives outside the page component on purpose — nested inside it, every
 * keystroke in the reason box would remount the card and re-fetch its
 * screenshot.
 */
function SubmissionCard({ u, kind, busy, zoom, decide, rejecting, setRejecting, customReason, setCustomReason }: {
  u: Submission
  kind: 'pending' | 'self'
  busy: string | null
  zoom: (url: string) => void
  decide: (u: Submission, action: 'approve' | 'reject', reason?: string) => void
  rejecting: string | null
  setRejecting: (id: string | null) => void
  customReason: string
  setCustomReason: (v: string) => void
}) {
  const stamp = kind === 'self' ? u.accmVerifiedAt : u.accmProofAt
  return (
      <div className="bg-surface rounded-xl border border-line p-3 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar src={u.image} name={u.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
            <p className="text-xs text-ink3 truncate">{u.email}</p>
            {stamp && (
              <p className="text-[10px] text-ink3 mt-0.5">
                {kind === 'self' ? 'Verified' : 'Submitted'} {format(new Date(stamp), 'MMM d, yyyy · h:mma')}
              </p>
            )}
          </div>
          {u.username && (
            <a
              href={`/profile/${u.id}`}
              className="shrink-0 text-ink3 hover:text-yellow-500 transition-colors"
              title="Open profile"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* What staff must match against the screenshot. */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-elevated border border-line px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">Real name</p>
            <p className="font-semibold text-ink truncate">{u.realName || '—'}</p>
          </div>
          <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">Must appear in image</p>
            <p className="font-mono font-bold text-yellow-500 truncate text-sm">{u.accmNumber || '—'}</p>
          </div>
        </div>

        {u.accmProofUrl ? (
          <button
            type="button"
            onClick={() => zoom(u.accmProofUrl!)}
            className="block w-full relative h-44 rounded-lg overflow-hidden border border-line bg-elevated"
            title="Tap to enlarge"
          >
            <Image src={u.accmProofUrl} alt="Proof of ACCM account" fill sizes="480px" className="object-contain" unoptimized />
          </button>
        ) : (
          <p className="text-xs text-ink3 italic">No screenshot attached.</p>
        )}

        {rejecting === u.id ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
            <p className="text-[11px] font-bold text-ink">
              Pick a reason — {u.name || 'the member'} sees this word for word and is locked out until they re-upload.
            </p>
            {REJECT_REASONS.map(r => (
              <button
                key={r}
                onClick={() => decide(u, 'reject', r)}
                disabled={busy === u.id}
                className="block w-full text-left text-[11px] text-ink2 hover:text-ink bg-elevated hover:bg-line border border-line rounded-lg px-2.5 py-2 disabled:opacity-60 transition-colors"
              >
                {r}
              </button>
            ))}
            <textarea
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Or write your own reason…"
              className="w-full text-[11px] bg-elevated border border-line rounded-lg px-2.5 py-2 text-ink placeholder:text-ink3 resize-none focus:outline-none focus:border-yellow-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejecting(null); setCustomReason('') }}
                disabled={busy === u.id}
                className="flex-1 text-xs font-bold border border-line text-ink2 hover:text-ink disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => decide(u, 'reject', customReason)}
                disabled={busy === u.id || !customReason.trim()}
                className="flex-1 text-xs font-bold bg-red-500 hover:bg-red-400 text-white disabled:opacity-40 rounded-lg px-3 py-2 transition-colors"
              >
                Send my reason
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setRejecting(u.id); setCustomReason('') }}
              disabled={busy === u.id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold border border-line text-ink2 hover:text-red-400 hover:border-red-400/40 disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {kind === 'self' ? 'Revoke' : 'Not accepted'}
            </button>
            <button
              onClick={() => decide(u, 'approve')}
              disabled={busy === u.id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {busy === u.id ? 'Saving…' : kind === 'self' ? 'Looks right' : 'Verify'}
            </button>
          </div>
        )}
      </div>
  )
}
