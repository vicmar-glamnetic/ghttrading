'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Users, UserPlus, UserCheck, Search } from 'lucide-react'

interface Trader {
  id: string; name: string | null; image: string | null; username: string | null; bio?: string | null
}
interface FriendReqWithSender  { id: string; sender:   Trader; status: string; createdAt: string }
interface FriendReqWithReceiver{ id: string; receiver: Trader; status: string; createdAt: string }
interface FriendReqFull        { id: string; sender: Trader; receiver: Trader; status: string }

interface FriendsData {
  pendingReceived: FriendReqWithSender[]
  pendingSent:     FriendReqWithReceiver[]
  friends:         FriendReqFull[]
  suggestions:     Trader[]
}

type Tab = 'requests' | 'friends' | 'discover'

export default function FriendsPage() {
  const [data, setData] = useState<FriendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [actionMap, setActionMap] = useState<Record<string, string>>({}) // userId → state
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({})
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Trader[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users/friends')
      if (!res.ok) throw new Error('Failed to load')
      const d = await res.json()
      setData(d)
      // Auto-switch to discover if no pending requests
      if (d.pendingReceived?.length === 0 && activeTab === 'requests') {
        if (d.friends?.length > 0) setActiveTab('friends')
        else setActiveTab('discover')
      }
    } catch {
      setError('Could not load traders. Please refresh.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  // Search
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`)
        const d = await res.json()
        setSearchResults(Array.isArray(d) ? d : [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  async function handleFriendRequest(userId: string, action: string) {
    setActionMap(m => ({ ...m, [userId]: 'loading' }))
    try {
      const res = await fetch(`/api/users/${userId}/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      setActionMap(m => ({ ...m, [userId]: action }))
      load() // refresh
    } catch {
      setActionMap(m => ({ ...m, [userId]: '' }))
    }
  }

  async function handleFollow(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' })
      const d = await res.json()
      setFollowedMap(m => ({ ...m, [userId]: d.following }))
    } catch {}
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'requests', label: 'Requests', count: data?.pendingReceived.length },
    { id: 'friends',  label: 'Friends',  count: data?.friends.length        },
    { id: 'discover', label: 'Discover'                                      },
  ]

  function TraderCard({
    user,
    action,
    onPrimary,
    primaryLabel,
    onSecondary,
    secondaryLabel,
    sentPending,
  }: {
    user: Trader
    action?: string
    onPrimary: () => void
    primaryLabel: string
    onSecondary?: () => void
    secondaryLabel?: string
    sentPending?: boolean
  }) {
    const loading = action === 'loading'
    return (
      <div className="flex items-center gap-3 p-4 hover:bg-[#1e1e2c] transition-colors">
        <Link href={`/profile/${user.id}`} className="shrink-0">
          <Avatar src={user.image} name={user.name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.id}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors block truncate">
            {user.name || 'Trader'}
          </Link>
          <p className="text-xs text-[#5a5a72] truncate">@{user.username || 'trader'}</p>
          {user.bio && <p className="text-xs text-[#9090a8] truncate mt-0.5">{user.bio}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {sentPending ? (
            <Button variant="secondary" size="sm" onClick={onPrimary} loading={loading} className="text-xs">
              Cancel
            </Button>
          ) : (
            <Button variant="gold" size="sm" onClick={onPrimary} loading={loading} className="text-xs">
              {primaryLabel}
            </Button>
          )}
          {onSecondary && secondaryLabel && (
            <Button variant="secondary" size="sm" onClick={onSecondary} loading={loading} className="text-xs">
              {secondaryLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const displayList = searchQ.length >= 2 ? searchResults : (data?.suggestions || [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-[#f0f0f8] text-lg">Traders</h1>
      </div>

      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#2a2a3a]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-yellow-500 text-yellow-500'
                  : 'text-[#5a5a72] hover:bg-[#1e1e2c] hover:text-[#9090a8]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-yellow-500 text-black' : 'bg-[#2a2a3a] text-[#9090a8]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2a2a3a]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-[#2a2a3a] rounded" />
                  <div className="h-2 w-24 bg-[#2a2a3a] rounded" />
                </div>
                <div className="w-20 h-7 bg-[#2a2a3a] rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-3">Retry</Button>
          </div>
        ) : (
          <>
            {/* ── Requests tab ── */}
            {activeTab === 'requests' && (
              <div className="divide-y divide-[#2a2a3a]">
                {(data?.pendingReceived.length === 0 && data?.pendingSent.length === 0) ? (
                  <div className="p-10 text-center">
                    <UserPlus className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                    <p className="text-[#5a5a72] text-sm">No pending requests</p>
                    <button onClick={() => setActiveTab('discover')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                      Discover traders →
                    </button>
                  </div>
                ) : (
                  <>
                    {data?.pendingReceived.map(r => (
                      <TraderCard
                        key={r.id}
                        user={r.sender}
                        action={actionMap[r.sender.id]}
                        onPrimary={() => handleFriendRequest(r.sender.id, 'accept')}
                        primaryLabel="Accept"
                        onSecondary={() => handleFriendRequest(r.sender.id, 'decline')}
                        secondaryLabel="Decline"
                      />
                    ))}
                    {data?.pendingSent.map(r => (
                      <TraderCard
                        key={r.id}
                        user={r.receiver}
                        action={actionMap[r.receiver.id]}
                        onPrimary={() => handleFriendRequest(r.receiver.id, 'cancel')}
                        primaryLabel="Cancel"
                        sentPending
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Friends tab ── */}
            {activeTab === 'friends' && (
              <div className="divide-y divide-[#2a2a3a]">
                {!data?.friends.length ? (
                  <div className="p-10 text-center">
                    <UserCheck className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                    <p className="text-[#5a5a72] text-sm">No friends yet</p>
                    <button onClick={() => setActiveTab('discover')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                      Find traders to connect with →
                    </button>
                  </div>
                ) : data.friends.map(f => {
                  // The "other" person
                  const other = f.sender.id === f.receiver.id ? f.sender : f.receiver
                  return (
                    <div key={f.id} className="flex items-center gap-3 p-4 hover:bg-[#1e1e2c] transition-colors">
                      <Link href={`/profile/${other.id}`} className="shrink-0">
                        <Avatar src={other.image} name={other.name} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${other.id}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors block truncate">
                          {other.name || 'Trader'}
                        </Link>
                        <p className="text-xs text-[#5a5a72] truncate">@{other.username || 'trader'}</p>
                      </div>
                      <Link href={`/profile/${other.id}`}>
                        <Button variant="outline" size="sm" className="text-xs shrink-0">View</Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Discover tab ── */}
            {activeTab === 'discover' && (
              <div>
                {/* Search bar */}
                <div className="p-3 border-b border-[#2a2a3a]">
                  <div className="flex items-center gap-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 focus-within:border-yellow-500/50 transition-colors">
                    <Search className="w-4 h-4 text-[#5a5a72] shrink-0" />
                    <input
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search traders by name or username…"
                      className="bg-transparent text-sm outline-none w-full text-[#f0f0f8] placeholder-[#5a5a72]"
                    />
                    {searching && <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </div>
                </div>

                <div className="divide-y divide-[#2a2a3a]">
                  {displayList.length === 0 ? (
                    <div className="p-10 text-center">
                      <Users className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                      <p className="text-[#5a5a72] text-sm">
                        {searchQ.length >= 2 ? 'No traders found' : 'No suggestions available'}
                      </p>
                    </div>
                  ) : displayList.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-4 hover:bg-[#1e1e2c] transition-colors">
                      <Link href={`/profile/${user.id}`} className="shrink-0">
                        <Avatar src={user.image} name={user.name} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${user.id}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors block truncate">
                          {user.name || 'Trader'}
                        </Link>
                        <p className="text-xs text-[#5a5a72] truncate">@{user.username || 'trader'}</p>
                        {user.bio && <p className="text-xs text-[#9090a8] truncate mt-0.5">{user.bio}</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          variant={followedMap[user.id] ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleFollow(user.id)}
                          className="text-xs"
                        >
                          {followedMap[user.id] ? 'Following' : 'Follow'}
                        </Button>
                        <Button
                          variant={actionMap[user.id] === 'send' ? 'secondary' : 'gold'}
                          size="sm"
                          onClick={() => handleFriendRequest(user.id, actionMap[user.id] === 'send' ? 'cancel' : 'send')}
                          loading={actionMap[user.id] === 'loading'}
                          className="text-xs"
                        >
                          {actionMap[user.id] === 'send' ? 'Requested' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
