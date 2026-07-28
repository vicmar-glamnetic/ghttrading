'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNowStrict } from 'date-fns'
import {
  ArrowLeft, BookOpen, BookX, Search, Users, TrendingUp,
} from 'lucide-react'
import { OnlineAvatar } from '@/components/ui/OnlineAvatar'

interface JournalUser {
  id: string
  name: string | null
  email: string | null
  username: string | null
  image: string | null
  role: 'admin' | 'coach' | 'member'
  approved: boolean
  accmMember: boolean
  createdAt: string
  lastSeenAt: string | null
  entryCount: number
  firstEntryAt: string | null
  lastEntryAt: string | null
}
interface Stats { totalUsers: number; withJournal: number; withoutJournal: number; totalEntries: number }

const ROLE_OPTIONS = ['admin', 'coach', 'member'] as const
const PAGE_SIZE = 20

const roleBadge: Record<string, string> = {
  admin: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  coach: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  member: 'bg-elevated text-ink2 border-line',
}

export default function AdminJournalsPage() {
  const [users, setUsers] = useState<JournalUser[]>([])
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, withJournal: 0, withoutJournal: 0, totalEntries: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [hasFilter, setHasFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (q.trim()) p.set('q', q.trim())
      if (roleFilter) p.set('role', roleFilter)
      if (hasFilter) p.set('has', hasFilter)
      const res = await fetch(`/api/admin/journals?${p.toString()}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setStats(data.stats ?? { totalUsers: 0, withJournal: 0, withoutJournal: 0, totalEntries: 0 })
    } finally {
      setLoading(false)
    }
  }, [q, roleFilter, hasFilter])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search
    return () => clearTimeout(t)
  }, [load])

  // Any filter change sends us back to page 1 — done at the source rather than
  // in an effect, which would cost an extra render pass.
  function applyQ(v: string) { setQ(v); setPage(1) }
  function applyRole(v: string) { setRoleFilter(v); setPage(1) }
  function applyHas(v: '' | 'true' | 'false') { setHasFilter(v); setPage(1) }

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const pagedUsers = users.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const adoption = stats.totalUsers ? Math.round((stats.withJournal / stats.totalUsers) * 100) : 0

  function exportCsv() {
    const head = ['Name', 'Email', 'Username', 'Role', 'Has journal', 'Entries', 'First entry', 'Last entry', 'Joined']
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = users.map(u => [
      u.name ?? '', u.email ?? '', u.username ?? '', u.role,
      u.entryCount > 0 ? 'yes' : 'no', u.entryCount,
      u.firstEntryAt ? format(new Date(u.firstEntryAt), 'yyyy-MM-dd') : '',
      u.lastEntryAt ? format(new Date(u.lastEntryAt), 'yyyy-MM-dd') : '',
      format(new Date(u.createdAt), 'yyyy-MM-dd'),
    ].map(cell).join(','))
    const blob = new Blob([[head.map(cell).join(','), ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-adoption-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/admin" className="text-ink3 hover:text-yellow-500 transition-colors" aria-label="Back to admin">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <BookOpen className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg truncate">Admin · Journals</h1>
        </div>
        <button
          onClick={exportCsv}
          disabled={loading || users.length === 0}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink2 hover:text-yellow-500 hover:border-yellow-500/30 transition-colors disabled:opacity-40 shrink-0"
        >
          Export CSV
        </button>
      </div>

      <p className="text-xs text-ink3">
        Every member since day one, and whether they&apos;ve ever written a journal entry. Counts are all-time.
      </p>

      {/* stats — clicking a tile filters the table below */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-ink', filter: '' as const },
          { label: 'Has Journal', value: stats.withJournal, icon: BookOpen, color: 'text-green-400', filter: 'true' as const },
          { label: 'No Journal', value: stats.withoutJournal, icon: BookX, color: 'text-red-400', filter: 'false' as const },
          { label: 'Total Entries', value: stats.totalEntries, icon: TrendingUp, color: 'text-yellow-500', filter: null },
        ].map(({ label, value, icon: Icon, color, filter }) => (
          <div
            key={label}
            {...(filter !== null ? {
              role: 'button', tabIndex: 0,
              onClick: () => applyHas(filter),
              onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyHas(filter) } },
            } : {})}
            className={`rounded-xl border bg-surface p-3 transition-colors ${
              filter !== null && hasFilter === filter ? 'border-yellow-500/40' : 'border-line'
            } ${filter !== null ? 'cursor-pointer hover:border-yellow-500/40' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-ink3 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            {label === 'Has Journal' && <p className="text-[10px] text-ink3 mt-0.5">{adoption}% of all users</p>}
          </div>
        ))}
      </div>

      {/* search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => applyQ(e.target.value)}
            placeholder="Search name, email or @username…"
            className="w-full bg-surface border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { value: '', label: 'All' },
            { value: 'true', label: 'Has journal' },
            { value: 'false', label: 'No journal' },
          ] as const).map(({ value, label }) => (
            <button key={value || 'all'} onClick={() => applyHas(value)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${hasFilter === value ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {label}
            </button>
          ))}
          <span className="w-px self-stretch bg-line mx-1" aria-hidden />
          {['', ...ROLE_OPTIONS].map(r => (
            <button key={r || 'all-roles'} onClick={() => applyRole(r)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${roleFilter === r ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {r === '' ? 'All roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink3">
                <th className="p-3 font-semibold">User</th>
                <th className="p-3 font-semibold">Journal</th>
                <th className="p-3 font-semibold text-right">Entries</th>
                <th className="p-3 font-semibold hidden md:table-cell">First entry</th>
                <th className="p-3 font-semibold hidden md:table-cell">Last entry</th>
                <th className="p-3 font-semibold hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-ink3">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-ink3">No users found.</td></tr>
              ) : pagedUsers.map(u => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-elevated/50">
                  <td className="p-3">
                    <Link href={`/profile/${u.id}`} className="flex items-center gap-2.5 min-w-0 group">
                      <OnlineAvatar src={u.image} name={u.name} size="sm" lastSeenAt={u.lastSeenAt} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate group-hover:text-yellow-500 transition-colors">
                          {u.name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-ink3 truncate">{u.email}</p>
                        <span className={`mt-0.5 inline-block text-[10px] font-semibold capitalize rounded-full border px-1.5 py-0.5 ${roleBadge[u.role]}`}>
                          {u.role}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3">
                    {u.entryCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 rounded-full px-2 py-1">
                        <BookOpen className="w-3 h-3" /> Journalling
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 rounded-full px-2 py-1">
                        <BookX className="w-3 h-3" /> Never
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold text-ink2">
                    {u.entryCount || <span className="text-ink3">—</span>}
                  </td>
                  <td className="p-3 hidden md:table-cell text-ink3 text-xs">
                    {u.firstEntryAt ? format(new Date(u.firstEntryAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs">
                    {u.lastEntryAt ? (
                      <>
                        <span className="text-ink2">{format(new Date(u.lastEntryAt), 'MMM d, yyyy')}</span>
                        <span className="block text-[10px] text-ink3">
                          {formatDistanceToNowStrict(new Date(u.lastEntryAt), { addSuffix: true })}
                        </span>
                      </>
                    ) : <span className="text-ink3">—</span>}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-ink3 text-xs">
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && users.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <p className="text-[11px] text-ink3">
              Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, users.length)} of {users.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
              >
                Prev
              </button>
              <span className="text-[11px] text-ink3 tabular-nums px-1">{pageSafe} / {pageCount}</span>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={pageSafe >= pageCount}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-ink2 disabled:hover:border-line transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-ink3">
        Entry contents stay private — this only reports counts and dates.
      </p>
    </div>
  )
}
