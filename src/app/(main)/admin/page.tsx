'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { OnlineAvatar } from '@/components/ui/OnlineAvatar'
import { Button } from '@/components/ui/Button'
import {
  Shield, Users, GraduationCap, UserCog, Plus, Search, Trash2, X, DollarSign, Wifi, Mail,
} from 'lucide-react'

import { format } from 'date-fns'
import { trialDaysLeft } from '@/lib/billing'
import { isOnline, lastSeenLabel, activeAgoLabel, HEARTBEAT_MS } from '@/lib/presence'

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  username: string | null
  image: string | null
  role: 'admin' | 'coach' | 'member'
  approved: boolean
  accmMember: boolean
  accmNumber: string | null
  subscriptionStatus: string
  paymentRef: string | null
  trialEndsAt: string | null
  subscriptionEnd: string | null
  createdAt: string
  lastSeenAt: string | null
}
interface Stats { total: number; admin: number; coach: number; member: number; onlineNow: number }

const ROLE_OPTIONS = ['admin', 'coach', 'member'] as const
const PAGE_SIZE = 20

const roleBadge: Record<string, string> = {
  admin: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  coach: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  member: 'bg-elevated text-ink2 border-line',
}

function subBadge(status: string) {
  if (status === 'active') return 'bg-green-400/15 text-green-400'
  if (status === 'comp') return 'bg-blue-400/15 text-blue-400'
  if (status === 'pending') return 'bg-amber-400/15 text-amber-400'
  if (status === 'past_due' || status === 'canceled') return 'bg-red-400/15 text-red-400'
  return 'bg-elevated text-ink3'
}

export default function AdminPage() {
  const { data: session } = useSession()
  const meId = session?.user?.id
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, admin: 0, coach: 0, member: 0, onlineNow: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [accmFilter, setAccmFilter] = useState<'' | 'true' | 'false'>('')
  const [showAdd, setShowAdd] = useState(false)
  const [showOnline, setShowOnline] = useState(false)
  const [page, setPage] = useState(1)

  // PayPal plan setup
  const [ppLoading, setPpLoading] = useState(false)
  const [ppPlans, setPpPlans] = useState<{ standardPlanId: string; accmPlanId: string } | null>(null)
  const [ppError, setPpError] = useState('')

  // One-time base64 → Blob migration
  const [migBusy, setMigBusy] = useState(false)
  const [migStatus, setMigStatus] = useState('')

  // Weekly recap
  const [recapBusy, setRecapBusy] = useState(false)
  const [recapMsg, setRecapMsg] = useState('')

  // Win-back email to expired non-ACCM ($5) members
  const [winbackBusy, setWinbackBusy] = useState(false)
  const [winbackMsg, setWinbackMsg] = useState('')
  const [winbackCount, setWinbackCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/winback')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWinbackCount(d.count) })
      .catch(() => {})
  }, [])

  async function sendWinback() {
    if (!winbackCount) return
    if (!confirm(`Send the $5 win-back email to ${winbackCount} expired non-ACCM member${winbackCount === 1 ? '' : 's'}?`)) return
    setWinbackBusy(true); setWinbackMsg('')
    try {
      const res = await fetch('/api/admin/winback', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setWinbackMsg(d.error || 'Failed to send')
      else if (d.total === 0) setWinbackMsg('No expired non-ACCM members to email right now.')
      else setWinbackMsg(`✓ Sent to ${d.sent} of ${d.total}${d.failed ? ` · ${d.failed} failed` : ''}`)
    } catch {
      setWinbackMsg('Failed to send')
    } finally { setWinbackBusy(false) }
  }

  async function postRecap() {
    setRecapBusy(true); setRecapMsg('')
    try {
      const res = await fetch('/api/cron/weekly-recap', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setRecapMsg(d.error || 'Failed')
      else if (d.skipped) setRecapMsg(`Skipped — ${d.skipped}`)
      else setRecapMsg(`✓ Posted: ${d.wins}W/${d.losses}L · ${d.net >= 0 ? '+' : ''}${d.net} gold pips`)
    } finally { setRecapBusy(false) }
  }

  async function migrateBlob() {
    setMigBusy(true); setMigStatus('Starting…')
    try {
      let total = 0
      for (let i = 0; i < 500; i++) { // safety cap; each call migrates a small batch
        const res = await fetch('/api/admin/migrate-blob', { method: 'POST' })
        const d = await res.json()
        if (!res.ok) { setMigStatus(`Error: ${d.error || 'failed'} (is the Blob store connected?)`); break }
        total += d.migrated
        setMigStatus(`Migrated ${total} so far · ${d.remaining} remaining…`)
        if (d.done || d.remaining === 0) { setMigStatus(`✓ Done — migrated ${total} item(s). All images now on Blob.`); break }
      }
    } finally {
      setMigBusy(false)
    }
  }

  async function setupPaypal() {
    setPpLoading(true); setPpError(''); setPpPlans(null)
    try {
      const res = await fetch('/api/admin/paypal/setup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setPpPlans({ standardPlanId: data.standardPlanId, accmPlanId: data.accmPlanId })
      else setPpError(data.error || 'Setup failed')
    } catch {
      setPpError('Setup failed')
    } finally {
      setPpLoading(false)
    }
  }

  // `silent` refreshes in place, so the presence poll below doesn't blank the
  // table into a "Loading…" row every minute.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const p = new URLSearchParams()
      if (q.trim()) p.set('q', q.trim())
      if (roleFilter) p.set('role', roleFilter)
      if (accmFilter) p.set('accm', accmFilter)
      const res = await fetch(`/api/admin/users?${p.toString()}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setStats(data.stats ?? { total: 0, admin: 0, coach: 0, member: 0, onlineNow: 0 })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [q, roleFilter, accmFilter])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search
    return () => clearTimeout(t)
  }, [load])

  // Back to the first page whenever the result set changes underneath us.
  useEffect(() => { setPage(1) }, [q, roleFilter, accmFilter])

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const pagedUsers = users.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  // Keep the online dots honest — they go stale on their own otherwise.
  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [load])

  async function changeRole(u: AdminUser, role: string) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: role as AdminUser['role'] } : x))
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Update failed'); }
    load()
  }

  async function changeSub(u: AdminUser, subscriptionStatus: string) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, subscriptionStatus } : x))
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionStatus }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Update failed'); }
    load()
  }

  async function approveUser(u: AdminUser) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, approved: true } : x))
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    })
  }

  async function toggleAccm(u: AdminUser) {
    const accmMember = !u.accmMember
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, accmMember } : x))
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accmMember }),
    })
  }

  async function setTrial(u: AdminUser, days: number) {
    const trialEndsAt = days === 0 ? null : new Date(Date.now() + days * 86400000).toISOString()
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, trialEndsAt } : x))
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trialDays: days }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Update failed'); }
    load()
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) return
    setUsers(prev => prev.filter(x => x.id !== u.id))
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Delete failed'); }
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">Admin · Users</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/courses" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink2 hover:text-yellow-500 hover:border-yellow-500/30 transition-colors">
            <GraduationCap className="w-3.5 h-3.5" /> Courses
          </Link>
          <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* stats — the Online Now tile opens the live roster */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Online Now', value: stats.onlineNow, icon: Wifi, color: 'text-green-400', onClick: () => setShowOnline(true) },
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-ink' },
          { label: 'Members', value: stats.member, icon: DollarSign, color: 'text-green-400' },
          { label: 'Coaches', value: stats.coach, icon: GraduationCap, color: 'text-blue-400' },
          { label: 'Admins', value: stats.admin, icon: UserCog, color: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color, onClick }) => (
          <div
            key={label}
            {...(onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } } : {})}
            className={`rounded-xl border border-line bg-surface p-3 ${onClick ? 'cursor-pointer hover:border-green-400/40 transition-colors' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-ink3 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            {onClick && <p className="text-[10px] text-ink3 mt-0.5">Tap to see who</p>}
          </div>
        ))}
      </div>

      {/* PayPal plan setup */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">PayPal billing</p>
            <p className="text-xs text-ink3">Create both subscription plans — $1.99 (ACCM) &amp; $5 (standard). Needs PAYPAL_CLIENT_ID &amp; SECRET set first.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={setupPaypal} loading={ppLoading} className="text-xs shrink-0">
            Set up plans
          </Button>
        </div>
        {ppError && <p className="text-xs text-red-400 mt-2">{ppError}</p>}
        {ppPlans && (
          <div className="mt-3 space-y-2">
            {[
              { env: 'NEXT_PUBLIC_PAYPAL_PLAN_ID_ACCM', label: '$1.99 ACCM', id: ppPlans.accmPlanId },
              { env: 'NEXT_PUBLIC_PAYPAL_PLAN_ID', label: '$5 standard', id: ppPlans.standardPlanId },
            ].map(({ env, label, id }) => (
              <div key={env} className="rounded-lg bg-sunken border border-line p-3">
                <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">{label} — set as {env}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-yellow-500 font-mono break-all flex-1">{id}</code>
                  <button onClick={() => navigator.clipboard.writeText(id)} className="text-xs text-ink3 hover:text-yellow-500 shrink-0">Copy</button>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-ink3">Add both to your env (locally + Vercel), then redeploy. Run this once only.</p>
          </div>
        )}
      </div>

      {/* Media migration → Blob */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Migrate media to Blob</p>
            <p className="text-xs text-ink3">Move existing base64 images out of the database into Vercel Blob to cut data transfer. Connect a Blob store first. Safe to run repeatedly.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={migrateBlob} loading={migBusy} className="text-xs shrink-0">
            Run migration
          </Button>
        </div>
        {migStatus && <p className="text-xs text-ink2 mt-2">{migStatus}</p>}
      </div>

      {/* Weekly recap */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Weekly performance recap</p>
            <p className="text-xs text-ink3">Post this week&apos;s signal results (W/L, win rate, net pips) to the feed. Also runs automatically every Monday.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={postRecap} loading={recapBusy} className="text-xs shrink-0">
            Post recap now
          </Button>
        </div>
        {recapMsg && <p className="text-xs text-ink2 mt-2">{recapMsg}</p>}
      </div>

      {/* Win-back expired non-ACCM members */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-yellow-500" /> Win-back email · $5 offer
            </p>
            <p className="text-xs text-ink3">
              Email expired non-ACCM (Standard) members whose access has lapsed, inviting them back for $5/mo with the full perks list.
              {winbackCount !== null && (
                <> <span className="font-semibold text-ink2">{winbackCount}</span> eligible right now.</>
              )}
            </p>
          </div>
          <Button
            variant="secondary" size="sm" onClick={sendWinback} loading={winbackBusy}
            disabled={winbackCount === 0}
            className="text-xs shrink-0"
          >
            {winbackCount === 0 ? 'No one to email' : 'Send win-back email'}
          </Button>
        </div>
        {winbackMsg && <p className="text-xs text-ink2 mt-2">{winbackMsg}</p>}
      </div>

      {/* search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, email or @username…"
            className="w-full bg-surface border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['', ...ROLE_OPTIONS].map(r => (
            <button key={r || 'all'} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${roleFilter === r ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {r === '' ? 'All' : r}
            </button>
          ))}
          <span className="w-px self-stretch bg-line mx-1" aria-hidden />
          {([
            { value: '', label: 'All tiers' },
            { value: 'true', label: 'ACCM' },
            { value: 'false', label: 'Non-ACCM' },
          ] as const).map(({ value, label }) => (
            <button key={value || 'all-tiers'} onClick={() => setAccmFilter(value)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${accmFilter === value ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {label}
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
                <th className="p-3 font-semibold">Role</th>
                <th className="p-3 font-semibold">Billing</th>
                <th className="p-3 font-semibold">Tier</th>
                <th className="p-3 font-semibold hidden md:table-cell">Joined</th>
                <th className="p-3 font-semibold text-right">Actions</th>
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
                    <div className="flex items-center gap-2.5 min-w-0">
                      <OnlineAvatar src={u.image} name={u.name} size="sm" lastSeenAt={u.lastSeenAt} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'} {u.id === meId && <span className="text-[10px] text-yellow-500">(you)</span>}</p>
                        <p className="text-xs text-ink3 truncate">{u.email}</p>
                        <p className={`text-[10px] ${isOnline(u.lastSeenAt) ? 'text-green-400 font-semibold' : 'text-ink3'}`}>
                          {lastSeenLabel(u.lastSeenAt)}
                        </p>
                        {!u.approved && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Pending approval
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u, e.target.value)}
                      disabled={u.id === meId}
                      className={`text-xs font-semibold capitalize rounded-full border px-2 py-1 outline-none scheme-dark disabled:opacity-60 ${roleBadge[u.role]}`}
                    >
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 capitalize inline-flex items-center gap-1 ${subBadge(u.subscriptionStatus)}`}>
                        {u.subscriptionStatus === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {u.subscriptionStatus}
                      </span>
                      {u.role === 'member' && (
                        ['active', 'comp'].includes(u.subscriptionStatus) ? (
                          <button onClick={() => changeSub(u, 'free')}
                            className="text-[10px] font-semibold text-ink3 hover:text-red-400 transition-colors">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => changeSub(u, 'active')}
                            className="text-[10px] font-semibold text-green-400 hover:text-green-300 transition-colors">
                            Activate
                          </button>
                        )
                      )}
                    </div>
                    {u.paymentRef && (
                      <a
                        href={`https://bscscan.com/tx/${u.paymentRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View transaction on BscScan"
                        className="mt-1 block text-[10px] font-mono text-amber-400/80 hover:text-amber-400 truncate max-w-[180px]"
                      >
                        tx: {u.paymentRef}
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleAccm(u)}
                      title="Toggle ACCM (free) vs Standard ($5)"
                      className={`text-xs font-semibold rounded-full px-2 py-1 border transition-colors ${
                        u.accmMember
                          ? 'bg-green-400/10 text-green-400 border-green-400/30'
                          : 'bg-elevated text-ink2 border-line'
                      }`}
                    >
                      {u.accmMember ? 'ACCM · Free' : 'Standard · $5'}
                    </button>
                    {u.accmNumber ? (
                      <p className="mt-1 text-[10px] font-mono text-ink2" title="ACCM account number">
                        ACCM #{u.accmNumber}
                      </p>
                    ) : u.accmMember && (
                      <p className="mt-1 text-[10px] text-ink3 italic" title="Member hasn't entered their ACCM number yet">
                        No ACCM #
                      </p>
                    )}
                    {!u.accmMember && <TrialControl user={u} onSet={days => setTrial(u, days)} />}
                  </td>
                  <td className="p-3 hidden md:table-cell text-ink3 text-xs">
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {!u.approved && (
                        <button
                          onClick={() => approveUser(u)}
                          className="text-[11px] font-bold bg-green-500 hover:bg-green-400 text-black rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => remove(u)}
                        disabled={u.id === meId}
                        className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors disabled:opacity-30 disabled:hover:text-ink3"
                        title={u.id === meId ? "You can't delete yourself" : 'Delete user'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
        Coaches and admins get free access. Members will require a $5/mo subscription once billing is enabled.
      </p>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />}
      {showOnline && <OnlineUsersModal onClose={() => setShowOnline(false)} />}
    </div>
  )
}

/* ---------- trial days editor ---------- */
const TRIAL_PRESETS = [7, 14, 30]

function TrialControl({ user, onSet }: { user: AdminUser; onSet: (days: number) => void }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const left = trialDaysLeft(user.trialEndsAt)

  function apply(days: number) {
    setOpen(false)
    setCustom('')
    onSet(days)
  }

  function applyCustom() {
    const days = Number(custom)
    if (!Number.isInteger(days) || days < 0 || days > 365) return
    apply(days)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Set trial length"
        className={`mt-1 block text-[10px] hover:underline ${left > 0 ? 'text-amber-400' : 'text-ink3'}`}
      >
        {left > 0 ? `trial: ${left}d left` : 'no trial'} · edit
      </button>
    )
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {TRIAL_PRESETS.map(d => (
        <button key={d} onClick={() => apply(d)}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-elevated border border-line text-ink2 hover:border-yellow-500/40 hover:text-yellow-500">
          {d}d
        </button>
      ))}
      <input
        value={custom}
        onChange={e => setCustom(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') applyCustom(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="#"
        aria-label="Custom trial days"
        className="w-10 rounded bg-sunken border border-line px-1 py-0.5 text-[10px] text-ink outline-none focus:border-yellow-500/40 placeholder-ink3"
      />
      {left > 0 && (
        <button onClick={() => apply(0)}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-ink3 hover:text-red-400">
          End
        </button>
      )}
      <button onClick={() => setOpen(false)} className="text-ink3 hover:text-ink" aria-label="Cancel">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

/* ---------- online users modal ---------- */
interface OnlineUser {
  id: string
  name: string | null
  username: string | null
  email: string | null
  image: string | null
  role: string
  approved: boolean
  lastSeenAt: string
}

function OnlineUsersModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/presence?scope=admin')
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        if (cancelled) return
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
        setError('')
      } catch {
        if (!cancelled) setError('Could not load who is online. Retrying…')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, HEARTBEAT_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-line max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink">Online now</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {total}
            </span>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-2">
          {loading ? (
            <p className="p-8 text-center text-ink3 text-sm">Loading…</p>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-ink3 text-sm">Nobody is on the site right now.</p>
          ) : users.map(u => (
            <Link
              key={u.id}
              href={`/profile/${u.id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated transition-colors"
            >
              <OnlineAvatar src={u.image} name={u.name} size="md" lastSeenAt={u.lastSeenAt} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-ink truncate">{u.name || 'Unnamed'}</p>
                  {!u.approved && (
                    <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5 shrink-0">Pending</span>
                  )}
                </div>
                <p className="text-xs text-ink3 truncate">{u.email}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-semibold capitalize rounded-full border px-2 py-0.5 ${roleBadge[u.role]}`}>{u.role}</span>
                <p className="text-[10px] text-ink3 mt-0.5">{activeAgoLabel(u.lastSeenAt)}</p>
              </div>
            </Link>
          ))}
          {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-4 py-3 border-t border-line">
          <p className="text-[10px] text-ink3">
            Counts anyone whose tab was active in the last 5 minutes. Refreshes every minute.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- add user modal ---------- */
function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'coach' | 'member'>('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name, email and a 6+ char password are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      if (res.ok) onCreated()
      else setError((await res.json().catch(() => ({}))).error || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">Add User</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputCls} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className={inputCls} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password (6+ chars)" type="text" className={inputCls} />
          <div>
            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Role</label>
            <div className="flex gap-2 mt-1">
              {ROLE_OPTIONS.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${role === r ? 'bg-yellow-500 text-black' : 'bg-sunken border border-line text-ink3'}`}>
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink3 mt-1">
              {role === 'member' ? 'Paying tier (free until billing is enabled).' : 'Free access — no subscription required.'}
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" size="sm" onClick={save} loading={saving} className="flex-1">Create User</Button>
        </div>
      </div>
    </div>
  )
}
