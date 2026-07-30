'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { UserCheck, Check, X, BadgeCheck, ImageOff } from 'lucide-react'
import { format } from 'date-fns'

interface Pending {
  id: string; name: string | null; email: string | null; username: string | null; image: string | null; createdAt: string; accmMember: boolean; accmNumber: string | null
  realName: string | null; accmProofUrl: string | null; accmVerifyStatus: string; accmProofAt: string | null
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/approvals')
      const data = await res.json()
      setPending(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function approve(u: Pending) {
    setBusy(u.id)
    try {
      const res = await fetch('/api/staff/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })
      if (res.ok) setPending(prev => prev.filter(x => x.id !== u.id))
    } finally {
      setBusy(null)
    }
  }

  async function reject(u: Pending) {
    if (!confirm(`Reject ${u.email || u.name || 'this sign-up'}? This permanently deletes the account.`)) return
    setBusy(u.id)
    try {
      const res = await fetch('/api/staff/approvals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })
      if (res.ok) setPending(prev => prev.filter(x => x.id !== u.id))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Approvals</h1>
        {!loading && (
          <span className="ml-auto text-xs text-ink3 bg-surface border border-line rounded-full px-3 py-1">
            {pending.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface rounded-xl border border-line animate-pulse" />)}</div>
      ) : pending.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <UserCheck className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">No pending sign-ups — you&apos;re all caught up. 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(u => (
            <div key={u.id} className="bg-surface rounded-xl border border-line p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar src={u.image} name={u.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
                  <span className={`self-start shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${u.accmMember ? 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10' : 'text-ink3 border-line bg-elevated'}`}>
                    {u.accmMember ? 'ACCM member' : 'Other broker'}
                  </span>
                </div>
                <p className="text-xs text-ink3 truncate">{u.email}</p>
                {u.accmNumber && (
                  <p className="text-[10px] font-mono text-yellow-500 mt-0.5" title="ACCM account number">ACCM #{u.accmNumber}</p>
                )}
                <p className="text-[10px] text-ink3 mt-0.5">Registered {format(new Date(u.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
                <button
                  onClick={() => reject(u)}
                  disabled={busy === u.id}
                  title="Reject & delete this sign-up"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold border border-line text-ink2 hover:text-red-400 hover:border-red-400/40 disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => approve(u)}
                  disabled={busy === u.id}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> {busy === u.id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>

            {/* The proof, so this is a decision and not a guess. ACCM members
                upload it from /pending while they wait, so it's normally here
                before anyone opens this page. */}
            {u.accmMember && <ProofBlock u={u} onZoom={setZoom} />}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">
        Approving a member gives them access to the community. Their screenshot is deleted from storage at the same time.
      </p>

      {zoom && <ImageLightbox images={[zoom]} startIndex={0} onClose={() => setZoom(null)} />}
    </div>
  )
}

/**
 * What the ACCM member sent in, matched against what they claim. Deliberately
 * loud when there's nothing to check: approving an account with no proof behind
 * it is the thing this page exists to stop being accidental.
 */
function ProofBlock({ u, onZoom }: { u: Pending; onZoom: (url: string) => void }) {
  if (!u.accmProofUrl) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-line bg-elevated px-3 py-2.5">
        <ImageOff className="w-4 h-4 text-ink3 shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink3 leading-relaxed">
          {u.accmVerifyStatus === 'verified'
            ? 'Already reviewed — the screenshot has been cleared from storage.'
            : 'No screenshot yet. They’re asked for one on the waiting screen; approving now means nobody has checked their ACCM account.'}
        </p>
      </div>
    )
  }

  return (
    <>
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

      <button
        type="button"
        onClick={() => onZoom(u.accmProofUrl!)}
        className="block w-full relative h-44 rounded-lg overflow-hidden border border-line bg-elevated"
        title="Tap to enlarge"
      >
        <Image src={u.accmProofUrl} alt="Proof of ACCM account" fill sizes="480px" className="object-contain" unoptimized />
      </button>

      {u.accmVerifyStatus === 'verified' && (
        <p className="flex items-center gap-1.5 text-[11px] text-green-500">
          <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
          Verified from this screenshot
          {u.accmProofAt && ` on ${format(new Date(u.accmProofAt), 'MMM d, h:mma')}`}
        </p>
      )}
    </>
  )
}
