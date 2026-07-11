'use client'
import { useState, useEffect, useCallback } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { UserCheck, Check, X } from 'lucide-react'
import { format } from 'date-fns'

interface Pending {
  id: string; name: string | null; email: string | null; username: string | null; image: string | null; createdAt: string; accmMember: boolean
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

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
            <div key={u.id} className="flex items-center gap-3 bg-surface rounded-xl border border-line p-3">
              <Avatar src={u.image} name={u.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
                  <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${u.accmMember ? 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10' : 'text-ink3 border-line bg-elevated'}`}>
                    {u.accmMember ? 'ACCM member' : 'Other broker'}
                  </span>
                </div>
                <p className="text-xs text-ink3 truncate">{u.email}</p>
                <p className="text-[10px] text-ink3 mt-0.5">Registered {format(new Date(u.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => reject(u)}
                  disabled={busy === u.id}
                  title="Reject & delete this sign-up"
                  className="inline-flex items-center gap-1.5 text-xs font-bold border border-line text-ink2 hover:text-red-400 hover:border-red-400/40 disabled:opacity-60 rounded-lg px-3 py-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => approve(u)}
                  disabled={busy === u.id}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> {busy === u.id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">Approving a member gives them access to the community.</p>
    </div>
  )
}
