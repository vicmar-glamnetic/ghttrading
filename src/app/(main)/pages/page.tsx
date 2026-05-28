'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Flag, Plus, X, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PageSummary {
  id: string
  name: string
  description: string | null
  category: string
  image: string | null
  verified: boolean
  _count: { followers: number; posts: number }
  followers: { followerId: string }[]
  owner?: { id: string; name: string | null; username: string | null; image: string | null }
}

interface PagesData {
  myPages: PageSummary[]
  following: PageSummary[]
  discover: PageSummary[]
}

const categories = [
  { value: 'general',    label: 'General'       },
  { value: 'signals',    label: 'Signals'       },
  { value: 'analysis',   label: 'Analysis'      },
  { value: 'education',  label: 'Education'     },
  { value: 'news',       label: 'Market News'   },
  { value: 'lifestyle',  label: 'Trader Life'   },
]

function categoryLabel(v: string) { return categories.find(c => c.value === v)?.label ?? v }

function PageCard({ page, isFollowing, onFollow, following, isOwn }: {
  page: PageSummary
  isFollowing: boolean
  onFollow: () => void
  following: boolean
  isOwn: boolean
}) {
  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden hover:border-[#3a3a4a] transition-colors">
      <div className="h-16 bg-linear-to-br from-yellow-500/10 to-[#1e1e2c] flex items-center justify-center">
        {page.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.image} alt={page.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#16161f]" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-[#16161f] flex items-center justify-center">
            <Flag className="w-5 h-5 text-yellow-500" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start gap-1 mb-0.5">
          <Link href={`/pages/${page.id}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors leading-tight flex-1 truncate">
            {page.name}
          </Link>
          {page.verified && <BadgeCheck className="w-4 h-4 text-yellow-500 shrink-0" />}
        </div>
        <p className="text-[10px] text-[#5a5a72] mb-1">{categoryLabel(page.category)}</p>
        {page.description && <p className="text-xs text-[#5a5a72] line-clamp-2 mb-2">{page.description}</p>}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-[#3a3a4a]">{page._count.followers.toLocaleString()} followers</p>
          {isOwn ? (
            <Link href={`/pages/${page.id}`}>
              <Button variant="outline" size="sm" className="text-xs">Manage</Button>
            </Link>
          ) : (
            <Button
              variant={isFollowing ? 'secondary' : 'gold'}
              size="sm"
              onClick={onFollow}
              loading={following}
              className="text-xs"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreatePageModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: PageSummary) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null, category }),
      })
      if (!res.ok) { setError('Failed to create page'); return }
      const page = await res.json()
      onCreate(page)
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
          <h2 className="font-bold text-[#f0f0f8]">Create a Page</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5a5a72] hover:text-[#f0f0f8] hover:bg-[#2a2a3a] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Page Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. GHT Gold Signals, XAU Daily Analysis…"
              required
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this page about?"
              rows={3}
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] transition-colors"
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <Button type="submit" variant="gold" loading={saving} className="w-full py-2.5">Create Page</Button>
        </form>
      </div>
    </div>
  )
}

type Tab = 'mine' | 'following' | 'discover'

export default function PagesPage() {
  const [data, setData] = useState<PagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('following')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pages')
      const d = await res.json()
      setData(d)
      if (d.myPages?.length > 0 || d.following?.length > 0) {
        setActiveTab(d.myPages?.length > 0 ? 'mine' : 'following')
      } else {
        setActiveTab('discover')
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleFollow(pageId: string, currentlyFollowing: boolean) {
    setFollowingMap(m => ({ ...m, [pageId]: true }))
    try {
      const res = await fetch(`/api/pages/${pageId}/follow`, { method: 'POST' })
      const d = await res.json()
      if (!currentlyFollowing && d.following) load()
      else if (currentlyFollowing && !d.following) load()
    } finally {
      setFollowingMap(m => ({ ...m, [pageId]: false }))
    }
  }

  function handleCreated(page: PageSummary) {
    setData(d => d ? { ...d, myPages: [page, ...d.myPages] } : d)
    setShowCreate(false)
    setActiveTab('mine')
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'mine',      label: 'My Pages',  count: data?.myPages.length    },
    { id: 'following', label: 'Following', count: data?.following.length  },
    { id: 'discover',  label: 'Discover'                                  },
  ]

  const emptyMessages: Record<Tab, { icon: React.ReactNode; text: string; action?: React.ReactNode }> = {
    mine:      { icon: <Flag className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />, text: "You haven't created any pages yet", action: <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">Create your first page →</button> },
    following: { icon: <Flag className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />, text: "You're not following any pages yet", action: <button onClick={() => setActiveTab('discover')} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">Discover pages →</button> },
    discover:  { icon: <Flag className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />, text: 'No pages to discover yet', action: <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">Create the first one →</button> },
  }

  const currentList = activeTab === 'mine' ? (data?.myPages ?? []) : activeTab === 'following' ? (data?.following ?? []) : (data?.discover ?? [])

  return (
    <div className="space-y-4">
      {showCreate && <CreatePageModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-[#f0f0f8] text-lg">Pages</h1>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Create Page
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-xl border border-[#2a2a3a] overflow-hidden">
                  <div className="h-16 bg-[#2a2a3a]" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-3/4 bg-[#2a2a3a] rounded" />
                    <div className="h-2 w-1/2 bg-[#2a2a3a] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-12 text-center">
              {emptyMessages[activeTab].icon}
              <p className="text-[#5a5a72] text-sm">{emptyMessages[activeTab].text}</p>
              {emptyMessages[activeTab].action}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentList.map(page => (
                <PageCard
                  key={page.id}
                  page={page}
                  isOwn={activeTab === 'mine'}
                  isFollowing={page.followers.length > 0}
                  onFollow={() => handleFollow(page.id, page.followers.length > 0)}
                  following={followingMap[page.id] ?? false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
