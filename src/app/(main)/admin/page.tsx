'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  Shield, Users, GraduationCap, UserCog, Plus, Search, Trash2, X, DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  username: string | null
  image: string | null
  role: 'admin' | 'coach' | 'member'
  accmMember: boolean
  subscriptionStatus: string
  subscriptionEnd: string | null
  createdAt: string
}
interface Stats { total: number; admin: number; coach: number; member: number }

const ROLE_OPTIONS = ['admin', 'coach', 'member'] as const

const roleBadge: Record<string, string> = {
  admin: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  coach: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  member: 'bg-elevated text-ink2 border-line',
}

function subBadge(status: string) {
  if (status === 'active') return 'bg-green-400/15 text-green-400'
  if (status === 'comp') return 'bg-blue-400/15 text-blue-400'
  if (status === 'past_due' || status === 'canceled') return 'bg-red-400/15 text-red-400'
  return 'bg-elevated text-ink3'
}

export default function AdminPage() {
  const { data: session } = useSession()
  const meId = session?.user?.id
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, admin: 0, coach: 0, member: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)

  // PayPal plan setup
  const [ppLoading, setPpLoading] = useState(false)
  const [ppPlans, setPpPlans] = useState<{ standardPlanId: string; accmPlanId: string } | null>(null)
  const [ppError, setPpError] = useState('')

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (q.trim()) p.set('q', q.trim())
      if (roleFilter) p.set('role', roleFilter)
      const res = await fetch(`/api/admin/users?${p.toString()}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setStats(data.stats ?? { total: 0, admin: 0, coach: 0, member: 0 })
    } finally {
      setLoading(false)
    }
  }, [q, roleFilter])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search
    return () => clearTimeout(t)
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

  async function toggleAccm(u: AdminUser) {
    const accmMember = !u.accmMember
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, accmMember } : x))
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accmMember }),
    })
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
        <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add User
        </Button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-ink' },
          { label: 'Members', value: stats.member, icon: DollarSign, color: 'text-green-400' },
          { label: 'Coaches', value: stats.coach, icon: GraduationCap, color: 'text-blue-400' },
          { label: 'Admins', value: stats.admin, icon: UserCog, color: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-ink3 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
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
        <div className="flex gap-2">
          {['', ...ROLE_OPTIONS].map(r => (
            <button key={r || 'all'} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${roleFilter === r ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
              {r === '' ? 'All' : r}
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
                <th className="p-3 font-semibold hidden sm:table-cell">Billing</th>
                <th className="p-3 font-semibold hidden sm:table-cell">Tier</th>
                <th className="p-3 font-semibold hidden md:table-cell">Joined</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-ink3">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-ink3">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-elevated/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={u.image} name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{u.name || 'Unnamed'} {u.id === meId && <span className="text-[10px] text-yellow-500">(you)</span>}</p>
                        <p className="text-xs text-ink3 truncate">{u.email}</p>
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
                  <td className="p-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 capitalize ${subBadge(u.subscriptionStatus)}`}>
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
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <button
                      onClick={() => toggleAccm(u)}
                      title="Toggle ACCM ($1.99) vs Standard ($5)"
                      className={`text-xs font-semibold rounded-full px-2 py-1 border transition-colors ${
                        u.accmMember
                          ? 'bg-green-400/10 text-green-400 border-green-400/30'
                          : 'bg-elevated text-ink2 border-line'
                      }`}
                    >
                      {u.accmMember ? 'ACCM · $1.99' : 'Standard · $5'}
                    </button>
                  </td>
                  <td className="p-3 hidden md:table-cell text-ink3 text-xs">
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => remove(u)}
                      disabled={u.id === meId}
                      className="p-1.5 rounded-lg text-ink3 hover:text-red-400 hover:bg-elevated transition-colors disabled:opacity-30 disabled:hover:text-ink3"
                      title={u.id === meId ? "You can't delete yourself" : 'Delete user'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-ink3">
        Coaches and admins get free access. Members will require a $5/mo subscription once billing is enabled.
      </p>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />}
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
