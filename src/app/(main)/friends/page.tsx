'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Users, UserPlus, UserCheck, Search, X, MessageCircle, UserRound } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface Lite { id: string; name: string | null; image: string | null; username: string | null }
interface Trader extends Lite {
  bio?: string | null
  role?: string | null
  mutualCount?: number
  mutualSample?: Lite[]
}
interface FriendReqWithSender  { id: string; sender:   Trader; status: string; createdAt: string }
interface FriendReqWithReceiver{ id: string; receiver: Trader; status: string; createdAt: string }
interface FriendReqFull        { id: string; sender: Trader; receiver: Trader; status: string }

interface FriendsData {
  pendingReceived: FriendReqWithSender[]
  pendingSent:     FriendReqWithReceiver[]
  friends:         FriendReqFull[]
  suggestions:     Trader[]
  currentUserId:   string
}

type Tab = 'suggestions' | 'requests' | 'friends'

// "Remove" on a suggestion only hides it for this viewer, on this device.
const DISMISSED_KEY = 'ght:dismissedSuggestions'
function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') } catch { return [] }
}

/** Big square photo, like Facebook's suggestion cards. */
function CardPhoto({ user }: { user: Trader }) {
  return (
    <Link href={`/profile/${user.id}`} className="block aspect-square bg-elevated overflow-hidden">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed hosts and data: URLs
        <img src={user.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-elevated to-sunken">
          {user.name
            ? <span className="text-3xl font-black text-ink3">{getInitials(user.name)}</span>
            : <UserRound className="h-1/3 w-1/3 text-ink3" />}
        </span>
      )}
    </Link>
  )
}

function MutualLine({ user }: { user: Trader }) {
  const count = user.mutualCount ?? 0
  if (count > 0) {
    return (
      <div className="flex items-center gap-1.5 min-h-5">
        <span className="flex -space-x-1.5">
          {(user.mutualSample ?? []).map(m => (
            <Avatar key={m.id} src={m.image} name={m.name} size="xs" className="w-4 h-4 text-[7px] ring-1 ring-surface" />
          ))}
        </span>
        <span className="text-xs text-ink3 truncate">{count} mutual friend{count === 1 ? '' : 's'}</span>
      </div>
    )
  }
  return (
    <p className="text-xs text-ink3 truncate min-h-5">
      {user.role === 'coach' ? <span className="text-yellow-500 font-semibold">Coach</span> : user.username ? `@${user.username}` : 'GHT trader'}
    </p>
  )
}

function PersonCard({ user, children }: { user: Trader; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface overflow-hidden hover:border-line2 transition-colors">
      <CardPhoto user={user} />
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <div className="min-w-0">
          <Link href={`/profile/${user.id}`} className="block truncate text-sm font-semibold text-ink hover:text-yellow-500 transition-colors">
            {user.name || 'Trader'}
          </Link>
          <MutualLine user={user} />
        </div>
        <div className="mt-auto flex flex-col gap-1.5">{children}</div>
      </div>
    </div>
  )
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">{children}</div>
)

function Empty({ icon: Icon, text, action }: { icon: React.ElementType; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-10 text-center">
      <Icon className="w-10 h-10 text-line2 mx-auto mb-3" />
      <p className="text-ink3 text-sm">{text}</p>
      {action}
    </div>
  )
}

export default function FriendsPage() {
  const [data, setData] = useState<FriendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('suggestions')
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [sent, setSent] = useState<Record<string, boolean>>({}) // suggestions you just added
  const [dismissed, setDismissed] = useState<string[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Trader[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/users/friends', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      setData(await res.json())
    } catch {
      setError('Could not load traders. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its await
  useEffect(() => { load() }, [load])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable in the browser
  useEffect(() => { setDismissed(readDismissed()) }, [])

  // Open on Requests when someone is waiting on you.
  const waiting = data?.pendingReceived.length ?? 0
  const [autoOpened, setAutoOpened] = useState(false)
  if (!autoOpened && waiting > 0) { setAutoOpened(true); setActiveTab('requests') }

  useEffect(() => {
    if (searchQ.trim().length < 2) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?traders=1&q=${encodeURIComponent(searchQ.trim())}`)
        const d = await res.json()
        setSearchResults(Array.isArray(d) ? d : [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  /** `refresh`: reload the lists afterwards (requests/friends). Suggestion cards keep their place after Add, like Facebook. */
  async function request(userId: string, action: 'send' | 'cancel' | 'accept' | 'decline', refresh = false) {
    setBusy(b => ({ ...b, [userId]: true }))
    try {
      const res = await fetch(`/api/users/${userId}/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      if (action === 'send') setSent(s => ({ ...s, [userId]: true }))
      if (action === 'cancel') setSent(s => ({ ...s, [userId]: false }))
      if (refresh) load()
    } catch {
      // leave the card as it was
    } finally {
      setBusy(b => ({ ...b, [userId]: false }))
    }
  }

  function dismiss(userId: string) {
    const next = [...new Set([...dismissed, userId])].slice(-300)
    setDismissed(next)
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch {}
  }

  const searchingNow = searchQ.trim().length >= 2
  const friendIds = new Set((data?.friends ?? []).flatMap(f => [f.sender.id, f.receiver.id]))
  const sentIds = new Set((data?.pendingSent ?? []).map(r => r.receiver.id))
  const suggestions = (data?.suggestions ?? []).filter(u => !dismissed.includes(u.id))

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'requests', label: 'Requests', count: waiting },
    { id: 'friends', label: 'Your friends', count: data?.friends.length },
  ]

  /** Add friend / Request sent, the same on suggestion and search cards. */
  function AddButtons({ user, removable }: { user: Trader; removable?: boolean }) {
    if (friendIds.has(user.id)) {
      return <Button variant="secondary" size="sm" className="w-full text-xs gap-1.5" disabled><UserCheck className="w-3.5 h-3.5" /> Friends</Button>
    }
    const isSent = sent[user.id] ?? sentIds.has(user.id)
    return (
      <>
        {isSent ? (
          <>
            <p className="text-center text-[11px] text-ink3">Request sent</p>
            <Button variant="secondary" size="sm" className="w-full text-xs" loading={busy[user.id]} onClick={() => request(user.id, 'cancel')}>Cancel</Button>
          </>
        ) : (
          <Button variant="gold" size="sm" className="w-full text-xs gap-1.5" loading={busy[user.id]} onClick={() => request(user.id, 'send')}>
            <UserPlus className="w-3.5 h-3.5" /> Add friend
          </Button>
        )}
        {removable && !isSent && (
          <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => dismiss(user.id)}>Remove</Button>
        )}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-ink text-lg">Traders</h1>
        </div>
        <label className="ml-auto flex w-full sm:w-72 items-center gap-2 bg-surface border border-line rounded-full px-3.5 py-2 focus-within:border-yellow-500/50 transition-colors">
          <Search className="w-4 h-4 text-ink3 shrink-0" />
          <input
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); if (e.target.value.trim().length < 2) setSearchResults([]) }}
            placeholder="Search traders"
            className="bg-transparent text-sm outline-none w-full text-ink placeholder-ink3"
          />
          {searching && <span className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0" />}
          {searchQ && !searching && (
            <button type="button" onClick={() => { setSearchQ(''); setSearchResults([]) }} aria-label="Clear search" className="text-ink3 hover:text-ink"><X className="w-4 h-4" /></button>
          )}
        </label>
      </div>

      {searchingNow ? (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-ink">Results for “{searchQ.trim()}”</h2>
          {searchResults.length === 0 && !searching ? (
            <Empty icon={Search} text="No traders found." />
          ) : (
            <Grid>
              {searchResults.map(u => (
                <PersonCard key={u.id} user={u}>
                  <AddButtons user={u} />
                </PersonCard>
              ))}
            </Grid>
          )}
        </section>
      ) : (
        <>
          <div role="tablist" className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? 'bg-yellow-500/15 text-yellow-500' : 'text-ink2 hover:bg-elevated'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-bold min-w-4.5 px-1.5 py-0.5 rounded-full ${tab.id === 'requests' ? 'bg-red-500 text-white' : 'bg-line text-ink2'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <Grid>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface overflow-hidden animate-pulse">
                  <div className="aspect-square bg-elevated" />
                  <div className="p-3 space-y-2"><div className="h-3 w-3/4 rounded bg-line" /><div className="h-8 rounded-lg bg-line" /></div>
                </div>
              ))}
            </Grid>
          ) : error ? (
            <div className="rounded-xl border border-line bg-surface p-8 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); load() }} className="mt-3">Retry</Button>
            </div>
          ) : activeTab === 'suggestions' ? (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-ink">People you may know</h2>
              {suggestions.length === 0 ? (
                <Empty icon={Users} text="No suggestions right now. Check back as more traders join." />
              ) : (
                <Grid>
                  {suggestions.map(u => (
                    <PersonCard key={u.id} user={u}>
                      <AddButtons user={u} removable />
                    </PersonCard>
                  ))}
                </Grid>
              )}
            </section>
          ) : activeTab === 'requests' ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-base font-bold text-ink">Friend requests</h2>
                {waiting === 0 ? (
                  <Empty icon={UserPlus} text="No new requests."
                    action={<button onClick={() => setActiveTab('suggestions')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400">See people you may know →</button>} />
                ) : (
                  <Grid>
                    {data!.pendingReceived.map(r => (
                      <PersonCard key={r.id} user={r.sender}>
                        <Button variant="gold" size="sm" className="w-full text-xs" loading={busy[r.sender.id]} onClick={() => request(r.sender.id, 'accept', true)}>Confirm</Button>
                        <Button variant="secondary" size="sm" className="w-full text-xs" disabled={busy[r.sender.id]} onClick={() => request(r.sender.id, 'decline', true)}>Delete</Button>
                      </PersonCard>
                    ))}
                  </Grid>
                )}
              </section>
              {(data?.pendingSent.length ?? 0) > 0 && (
                <section className="space-y-3">
                  <h2 className="text-base font-bold text-ink">Sent requests <span className="text-sm font-normal text-ink3">{data!.pendingSent.length}</span></h2>
                  <Grid>
                    {data!.pendingSent.map(r => (
                      <PersonCard key={r.id} user={r.receiver}>
                        <p className="text-center text-[11px] text-ink3">Request sent</p>
                        <Button variant="secondary" size="sm" className="w-full text-xs" loading={busy[r.receiver.id]} onClick={() => request(r.receiver.id, 'cancel', true)}>Cancel</Button>
                      </PersonCard>
                    ))}
                  </Grid>
                </section>
              )}
            </div>
          ) : (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-ink">Your friends <span className="text-sm font-normal text-ink3">{data?.friends.length ?? 0}</span></h2>
              {!data?.friends.length ? (
                <Empty icon={UserCheck} text="No friends yet."
                  action={<button onClick={() => setActiveTab('suggestions')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400">Find traders to connect with →</button>} />
              ) : (
                <Grid>
                  {data.friends.map(f => {
                    const other = f.sender.id === data.currentUserId ? f.receiver : f.sender
                    return (
                      <PersonCard key={f.id} user={other}>
                        <Link href={`/chat?dm=${other.id}`}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-elevated border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" /> Message
                        </Link>
                      </PersonCard>
                    )
                  })}
                </Grid>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
