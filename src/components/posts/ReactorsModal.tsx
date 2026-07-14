'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { getReaction, REACTIONS } from '@/lib/reactions'
import type { Reactor } from '@/types'

interface ReactorsModalProps {
  postId: string
  onClose: () => void
}

export function ReactorsModal({ postId, onClose }: ReactorsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reactors, setReactors] = useState<Reactor[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    let active = true
    fetch(`/api/posts/${postId}/reactions`)
      .then(res => res.json())
      .then(data => {
        if (!active) return
        setReactors(data.reactors ?? [])
        setCounts(data.counts ?? {})
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [postId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  const total = reactors.length
  const shown = tab === 'all' ? reactors : reactors.filter(r => r.type === tab)
  // Tabs: All + each reaction type present, in canonical order.
  const presentTabs = REACTIONS.filter(r => (counts[r.type] ?? 0) > 0)

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">Reactions</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-elevated rounded-lg transition-colors text-ink3">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-line overflow-x-auto">
          <button
            onClick={() => setTab('all')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === 'all' ? 'text-yellow-500 bg-yellow-500/10' : 'text-ink3 hover:text-ink2'
            }`}
          >
            All {total > 0 && <span className="ml-0.5 text-ink3">{total}</span>}
          </button>
          {presentTabs.map(r => (
            <button
              key={r.type}
              onClick={() => setTab(r.type)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === r.type ? 'text-yellow-500 bg-yellow-500/10' : 'text-ink3 hover:text-ink2'
              }`}
            >
              <span className="text-sm leading-none">{r.emoji}</span>
              {counts[r.type]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-center text-xs text-ink3 py-8">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="text-center text-xs text-ink3 py-8">No reactions yet</p>
          ) : (
            shown.map((r, i) => {
              const reaction = getReaction(r.type)
              return (
                <Link
                  key={`${r.user.id}-${i}`}
                  href={`/profile/${r.user.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-elevated transition-colors"
                >
                  <div className="relative">
                    <Avatar src={r.user.image} name={r.user.name} size="sm" />
                    <span
                      className="absolute -bottom-1 -right-1 text-xs leading-none"
                      title={reaction.label}
                    >
                      {reaction.emoji}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-ink truncate">{r.user.name}</span>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
