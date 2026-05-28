'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Globe, Lock, ArrowLeft, ImageIcon, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PostCard } from '@/components/posts/PostCard'
import type { PostWithDetails } from '@/types'

interface GroupMember {
  userId: string
  role: string
  status: string
  joinedAt: string
  user: { id: string; name: string | null; image: string | null; username: string | null }
}

interface GroupDetail {
  id: string
  name: string
  description: string | null
  image: string | null
  coverImage: string | null
  privacy: string
  createdAt: string
  ownerId: string
  owner: { id: string; name: string | null; image: string | null; username: string | null }
  _count: { members: number; posts: number }
  members: GroupMember[]
  myMembership: { role: string; status: string } | null
}

type Tab = 'posts' | 'members' | 'about'

function ComposeBox({ groupId, onPost }: { groupId: string; onPost: (post: PostWithDetails) => void }) {
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [images, setImages] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, images }),
      })
      if (!res.ok) return
      const post = await res.json()
      onPost(post)
      setContent('')
      setImages([])
    } finally {
      setPosting(false)
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) setImages(imgs => [...imgs, ev.target!.result as string])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar src={session?.user?.image} name={session?.user?.name} size="sm" className="shrink-0" />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share something with the group…"
          rows={2}
          className="flex-1 bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-xl px-3 py-2 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors resize-none"
        />
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap ml-9">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#2a2a3a]" />
              <button type="button" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between ml-9">
        <label className="cursor-pointer text-[#5a5a72] hover:text-yellow-500 transition-colors p-1.5 rounded-lg hover:bg-[#2a2a3a]">
          <ImageIcon className="w-4 h-4" />
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImage} />
        </label>
        <Button type="submit" variant="gold" size="sm" loading={posting} disabled={!content.trim()} className="gap-1.5 text-xs">
          <Send className="w-3.5 h-3.5" /> Post
        </Button>
      </div>
    </form>
  )
}

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const { data: session } = useSession()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [loadingGroup, setLoadingGroup] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('posts')

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`)
      if (res.status === 404) { setNotFound(true); return }
      const d = await res.json()
      setGroup(d)
    } catch {
      setNotFound(true)
    } finally {
      setLoadingGroup(false)
    }
  }, [groupId])

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/groups/${groupId}/posts${cursor ? `?cursor=${cursor}` : ''}`
      const res = await fetch(url)
      const d = await res.json()
      if (cursor) {
        setPosts(p => [...p, ...(d.posts ?? [])])
      } else {
        setPosts(d.posts ?? [])
      }
      setNextCursor(d.nextCursor)
    } finally {
      setLoadingPosts(false)
      setLoadingMore(false)
    }
  }, [groupId])

  useEffect(() => { fetchGroup() }, [fetchGroup])
  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleJoinLeave() {
    if (!group) return
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' })
      const d = await res.json()
      setGroup(g => g ? { ...g, myMembership: d.joined ? { role: 'member', status: 'active' } : null, _count: { ...g._count, members: g._count.members + (d.joined ? 1 : -1) } } : g)
    } finally {
      setJoining(false)
    }
  }

  function handleNewPost(post: PostWithDetails) {
    setPosts(p => [post, ...p])
    setGroup(g => g ? { ...g, _count: { ...g._count, posts: g._count.posts + 1 } } : g)
  }

  function handleDeletePost(postId: string) {
    setPosts(p => p.filter(x => x.id !== postId))
    setGroup(g => g ? { ...g, _count: { ...g._count, posts: Math.max(0, g._count.posts - 1) } } : g)
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link href="/groups" className="flex items-center gap-2 text-sm text-[#9090a8] hover:text-yellow-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Groups
        </Link>
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <p className="text-[#f0f0f8] font-semibold mb-1">Group not found</p>
          <p className="text-[#5a5a72] text-sm">This group may have been deleted.</p>
        </div>
      </div>
    )
  }

  const isMember = !!group?.myMembership
  const isOwner = group?.ownerId === session?.user?.id
  const tabs: { id: Tab; label: string }[] = [
    { id: 'posts',   label: 'Posts'   },
    { id: 'members', label: `Members${group ? ` (${group._count.members})` : ''}` },
    { id: 'about',   label: 'About'   },
  ]

  return (
    <div className="space-y-4">
      <Link href="/groups" className="flex items-center gap-2 text-sm text-[#9090a8] hover:text-yellow-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Groups
      </Link>

      {loadingGroup ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden animate-pulse">
          <div className="h-28 bg-[#2a2a3a]" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-48 bg-[#2a2a3a] rounded" />
            <div className="h-3 w-full bg-[#2a2a3a] rounded" />
          </div>
        </div>
      ) : group ? (
        <>
          {/* Header */}
          <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
            <div className="h-28 bg-linear-to-br from-yellow-500/15 to-[#1e1e2c] relative flex items-end p-4">
              <div className="flex items-end gap-3">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border-2 border-[#16161f] flex items-center justify-center shadow-lg">
                  {group.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.image} alt={group.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Users className="w-7 h-7 text-yellow-500" />
                  )}
                </div>
                <div className="pb-1">
                  <h1 className="font-bold text-[#f0f0f8] text-lg leading-tight">{group.name}</h1>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-[#9090a8]">
                      {group.privacy === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {group.privacy === 'private' ? 'Private' : 'Public'} group
                    </span>
                    <span className="text-[#3a3a4a]">·</span>
                    <span className="text-xs text-[#9090a8]">{group._count.members} members</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3 flex items-center justify-between gap-3">
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map(m => (
                  <Avatar key={m.userId} src={m.user.image} name={m.user.name} size="xs" className="border-2 border-[#16161f]" />
                ))}
                {group._count.members > 5 && (
                  <div className="w-6 h-6 rounded-full bg-[#2a2a3a] border-2 border-[#16161f] flex items-center justify-center">
                    <span className="text-[9px] text-[#9090a8] font-bold">+{group._count.members - 5}</span>
                  </div>
                )}
              </div>
              {!isOwner && (
                <Button
                  variant={isMember ? 'secondary' : 'gold'}
                  size="sm"
                  onClick={handleJoinLeave}
                  loading={joining}
                  className="text-xs shrink-0"
                >
                  {isMember ? 'Leave Group' : 'Join Group'}
                </Button>
              )}
              {isOwner && (
                <span className="text-xs text-yellow-500 font-semibold">Owner</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
            <div className="flex border-b border-[#2a2a3a]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-yellow-500 text-yellow-500' : 'text-[#5a5a72] hover:bg-[#1e1e2c] hover:text-[#9090a8]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'posts' && (
              <div className="p-4 space-y-4">
                {isMember && <ComposeBox groupId={groupId} onPost={handleNewPost} />}
                {!isMember && (
                  <div className="text-center py-6">
                    <p className="text-sm text-[#5a5a72]">Join the group to post and see member content</p>
                    <Button variant="gold" size="sm" onClick={handleJoinLeave} loading={joining} className="mt-3 text-xs">
                      Join Group
                    </Button>
                  </div>
                )}
                {isMember && (
                  loadingPosts ? (
                    <div className="space-y-3 animate-pulse">
                      {[1,2].map(i => (
                        <div key={i} className="bg-[#1e1e2c] rounded-xl p-4 space-y-3">
                          <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-[#2a2a3a]" /><div className="flex-1 space-y-1.5"><div className="h-3 w-32 bg-[#2a2a3a] rounded" /><div className="h-2 w-24 bg-[#2a2a3a] rounded" /></div></div>
                          <div className="h-3 w-full bg-[#2a2a3a] rounded" />
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-[#5a5a72] text-sm">No posts yet. Be the first to share!</p>
                    </div>
                  ) : (
                    <>
                      {posts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={session?.user?.id || ''}
                          onDelete={handleDeletePost}
                        />
                      ))}
                      {nextCursor && (
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            loading={loadingMore}
                            onClick={() => { setLoadingMore(true); fetchPosts(nextCursor) }}
                            className="text-xs"
                          >
                            Load more
                          </Button>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="divide-y divide-[#2a2a3a]">
                {group.members.map(m => (
                  <div key={m.userId} className="flex items-center gap-3 p-4 hover:bg-[#1e1e2c] transition-colors">
                    <Link href={`/profile/${m.userId}`} className="shrink-0">
                      <Avatar src={m.user.image} name={m.user.name} size="md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${m.userId}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors block truncate">
                        {m.user.name || 'Trader'}
                      </Link>
                      <p className="text-xs text-[#5a5a72]">@{m.user.username || 'trader'}</p>
                    </div>
                    {m.role !== 'member' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 capitalize">{m.role}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="p-6 space-y-4">
                {group.description ? (
                  <div>
                    <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-1.5">About</p>
                    <p className="text-sm text-[#f0f0f8] leading-relaxed">{group.description}</p>
                  </div>
                ) : (
                  <p className="text-[#5a5a72] text-sm">No description yet.</p>
                )}
                <div>
                  <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-1.5">Created by</p>
                  <Link href={`/profile/${group.owner.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar src={group.owner.image} name={group.owner.name} size="sm" />
                    <span className="text-sm text-[#f0f0f8]">{group.owner.name || 'Trader'}</span>
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider mb-1.5">Created</p>
                  <p className="text-sm text-[#f0f0f8]">{new Date(group.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {group.privacy === 'private' ? <Lock className="w-4 h-4 text-[#5a5a72]" /> : <Globe className="w-4 h-4 text-[#5a5a72]" />}
                  <span className="text-sm text-[#9090a8] capitalize">{group.privacy} group</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
