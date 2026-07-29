'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { BadgeCheck, Check, X, ExternalLink } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ImageLightbox } from '@/components/ui/ImageLightbox'

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

interface Pending {
  id: string
  name: string | null
  realName: string | null
  email: string | null
  username: string | null
  image: string | null
  accmNumber: string | null
  accmProofUrl: string | null
  accmProofAt: string | null
  createdAt: string
}

export default function VerificationsPage() {
  const [pending, setPending] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)  // user id with the reason panel open
  const [customReason, setCustomReason] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/verifications')
      const data = await res.json()
      setPending(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function decide(u: Pending, action: 'approve' | 'reject', reason = '') {
    if (action === 'reject' && !reason.trim()) return
    setBusy(u.id)
    try {
      const res = await fetch('/api/staff/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action, reason }),
      })
      if (res.ok) {
        setPending(prev => prev.filter(x => x.id !== u.id))
        setRejecting(null)
      } else {
        const d = await res.json().catch(() => null)
        alert(d?.error || 'Could not save that decision. Please try again.')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
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
      ) : pending.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <BadgeCheck className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">Nothing waiting for review — you&apos;re all caught up. 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(u => (
            <div key={u.id} className="bg-surface rounded-xl border border-line p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar src={u.image} name={u.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
                  <p className="text-xs text-ink3 truncate">{u.email}</p>
                  {u.accmProofAt && (
                    <p className="text-[10px] text-ink3 mt-0.5">
                      Submitted {format(new Date(u.accmProofAt), 'MMM d, yyyy · h:mma')}
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
                  onClick={() => setZoom(u.accmProofUrl)}
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
                    <X className="w-3.5 h-3.5" /> Not accepted
                  </button>
                  <button
                    onClick={() => decide(u, 'approve')}
                    disabled={busy === u.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> {busy === u.id ? 'Saving…' : 'Verify'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">
        The screenshot is deleted from storage as soon as you decide.
      </p>

      {zoom && <ImageLightbox images={[zoom]} startIndex={0} onClose={() => setZoom(null)} />}
    </div>
  )
}
