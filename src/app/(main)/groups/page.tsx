'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Plus, Lock, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

interface GroupSummary {
  id: string
  name: string
  description: string | null
  image: string | null
  privacy: string
  _count: { members: number; posts: number }
  members: { role: string; status: string }[]
  owner: { id: string; name: string | null; image: string | null; username: string | null }
}

interface GroupsData {
  myGroups: GroupSummary[]
  discover: GroupSummary[]
}

function GroupCard({ group, onJoin, joining }: { group: GroupSummary; onJoin: () => void; joining: boolean }) {
  const isMember = (group.members ?? []).length > 0

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden hover:border-[#3a3a4a] transition-colors">
      {/* Cover placeholder */}
      <div className="h-20 bg-linear-to-br from-yellow-500/10 to-[#1e1e2c] flex items-center justify-center">
        {group.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.image} alt={group.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#16161f]" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-[#16161f] flex items-center justify-center">
            <Users className="w-6 h-6 text-yellow-500" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link href={`/groups/${group.id}`} className="font-semibold text-[#f0f0f8] hover:text-yellow-500 transition-colors text-sm leading-tight">
            {group.name}
          </Link>
          <span className={`flex items-center gap-1 text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border ${group.privacy === 'private' ? 'border-[#3a3a4a] text-[#5a5a72]' : 'border-yellow-500/20 text-yellow-600'}`}>
            {group.privacy === 'private' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
            {group.privacy}
          </span>
        </div>
        {group.description && <p className="text-xs text-[#5a5a72] line-clamp-2 mb-3">{group.description}</p>}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#3a3a4a]">{group._count.members} member{group._count.members !== 1 ? 's' : ''} · {group._count.posts} post{group._count.posts !== 1 ? 's' : ''}</p>
          {isMember ? (
            <Link href={`/groups/${group.id}`}>
              <Button variant="outline" size="sm" className="text-xs">View</Button>
            </Link>
          ) : (
            <Button variant="gold" size="sm" onClick={onJoin} loading={joining} className="text-xs">Join</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: GroupSummary) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null, privacy }),
      })
      if (!res.ok) { setError('Failed to create group'); return }
      const group = await res.json()
      onCreate(group)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#16161f] rounded-2xl border border-[#2a2a3a] p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#f0f0f8]">Create Group</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5a5a72] hover:text-[#f0f0f8] hover:bg-[#2a2a3a] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Group Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Gold Scalpers, XAU Daily Traders…"
              required
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this group about?"
              rows={3}
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Privacy</label>
            <div className="grid grid-cols-2 gap-2">
              {(['public', 'private'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrivacy(p)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${privacy === p ? 'border-yellow-500/50 bg-yellow-500/5 text-yellow-400' : 'border-[#2a2a3a] text-[#5a5a72] hover:border-[#3a3a4a]'}`}
                >
                  {p === 'public' ? <Globe className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold capitalize">{p}</p>
                    <p className="text-[10px] leading-tight mt-0.5 opacity-70">{p === 'public' ? 'Anyone can join' : 'Members only'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" variant="gold" loading={saving} className="w-full py-2.5">Create Group</Button>
        </form>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const router = useRouter()
  const [data, setData] = useState<GroupsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [joiningMap, setJoiningMap] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'mine' | 'discover'>('mine')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/groups')
      const d = await res.json()
      setData(d)
      if (d.myGroups?.length === 0) setActiveTab('discover')
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleJoin(groupId: string) {
    setJoiningMap(m => ({ ...m, [groupId]: true }))
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' })
      const d = await res.json()
      if (d.joined) {
        load()
      }
    } finally {
      setJoiningMap(m => ({ ...m, [groupId]: false }))
    }
  }

  function handleCreated(group: GroupSummary) {
    setShowCreate(false)
    router.push(`/groups/${group.id}`)
  }

  const tabs = [
    { id: 'mine' as const,     label: 'My Groups',  count: data?.myGroups.length },
    { id: 'discover' as const, label: 'Discover',   count: data?.discover.length },
  ]

  return (
    <div className="space-y-4">
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-[#f0f0f8] text-lg">Groups</h1>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Create Group
        </Button>
      </div>

      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="flex border-b border-[#2a2a3a]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-yellow-500 text-yellow-500' : 'text-[#5a5a72] hover:bg-[#1e1e2c] hover:text-[#9090a8]'}`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-yellow-500 text-black' : 'bg-[#2a2a3a] text-[#9090a8]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-xl border border-[#2a2a3a] overflow-hidden">
                  <div className="h-20 bg-[#2a2a3a]" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-3/4 bg-[#2a2a3a] rounded" />
                    <div className="h-2 w-full bg-[#2a2a3a] rounded" />
                    <div className="h-2 w-1/2 bg-[#2a2a3a] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'mine' ? (
            !data?.myGroups.length ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                <p className="text-[#5a5a72] text-sm">You haven&apos;t joined any groups yet</p>
                <button onClick={() => setActiveTab('discover')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  Discover groups →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.myGroups.map(g => (
                  <GroupCard key={g.id} group={g} onJoin={() => handleJoin(g.id)} joining={joiningMap[g.id] ?? false} />
                ))}
              </div>
            )
          ) : (
            !data?.discover.length ? (
              <div className="py-12 text-center">
                <Globe className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                <p className="text-[#5a5a72] text-sm">No public groups yet</p>
                <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  Create the first one →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.discover.map(g => (
                  <GroupCard key={g.id} group={g} onJoin={() => handleJoin(g.id)} joining={joiningMap[g.id] ?? false} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
