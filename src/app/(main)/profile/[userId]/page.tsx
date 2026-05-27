'use client'
import { useState, useEffect, use, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MapPin, Globe, Calendar, UserPlus, UserCheck, UserMinus, Camera, Pencil, X, Check } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { PostWithDetails } from '@/types'

interface ProfileData {
  id: string
  name: string | null
  username: string | null
  image: string | null
  coverImage: string | null
  bio: string | null
  location: string | null
  website: string | null
  createdAt: string
  _count: { followers: number; following: number; posts: number }
  isFollowing: boolean
  friendRequest: { status: string; senderId: string } | null
}

// Converts a File to a base64 data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function AvatarUploadOverlay({ userId, currentImage, currentName, onUpdated }: {
  userId: string
  currentImage: string | null
  currentName: string | null
  onUpdated: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated(data.image)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#0a0a0f] bg-[#1e1e2c]">
        {/* Always use Avatar — it now handles data: URLs and image errors internally */}
        <Avatar src={currentImage} name={currentName} className="w-full h-full" />
      </div>
      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading
          ? <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-5 h-5 text-white" />
        }
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

function CoverUploadOverlay({ userId, currentCover, onUpdated }: {
  userId: string
  currentCover: string | null
  onUpdated: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImage: dataUrl }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated(data.coverImage)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {uploading
          ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-3.5 h-3.5" />
        }
        Change Cover
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}

function EditBioModal({ profile, onSave, onClose }: {
  profile: ProfileData
  onSave: (updated: Partial<ProfileData>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(profile.name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [location, setLocation] = useState(profile.location || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${profile.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, website }),
      })
      if (res.ok) {
        onSave({ name, bio, location, website })
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#f0f0f8]">Edit Profile</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#1e1e2c] rounded-lg transition-colors text-[#5a5a72]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Name', value: name, setter: setName, placeholder: 'Your name' },
            { label: 'Location', value: location, setter: setLocation, placeholder: 'City, Country' },
            { label: 'Website', value: website, setter: setWebsite, placeholder: 'https://...' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1">{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the community about yourself…"
              rows={3}
              className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] resize-none transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="gold" className="flex-1" loading={saving} onClick={handleSave}>
            <Check className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const isOwn = userId === session?.user?.id

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/users/${userId}/profile`).then(r => r.json()),
      fetch(`/api/posts?userId=${userId}`).then(r => r.json()),
    ]).then(([profileData, postsData]) => {
      setProfile(profileData)
      setPosts(postsData.posts || [])
      setLoading(false)
    })
  }, [userId])

  async function handleFollow() {
    if (!profile) return
    setActionLoading(true)
    const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' })
    const data = await res.json()
    setProfile(prev => prev ? {
      ...prev,
      isFollowing: data.following,
      _count: { ...prev._count, followers: prev._count.followers + (data.following ? 1 : -1) }
    } : prev)
    setActionLoading(false)
  }

  async function handleFriendRequest(action: string) {
    setActionLoading(true)
    const res = await fetch(`/api/users/${userId}/friend-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setProfile(prev => prev ? { ...prev, friendRequest: action === 'send' ? data : null } : prev)
    setActionLoading(false)
  }

  function handleAvatarUpdated(url: string) {
    setProfile(prev => prev ? { ...prev, image: url } : prev)
    updateSession()  // refresh session so navbar avatar updates too
  }

  function handleCoverUpdated(url: string) {
    setProfile(prev => prev ? { ...prev, coverImage: url } : prev)
  }

  function handleEditSaved(updated: Partial<ProfileData>) {
    setProfile(prev => prev ? { ...prev, ...updated } : prev)
  }

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="h-40 bg-[#1e1e2c]" />
          <div className="p-4 space-y-3">
            <div className="w-24 h-24 rounded-full bg-[#2a2a3a] -mt-12" />
            <div className="h-5 w-40 bg-[#2a2a3a] rounded" />
            <div className="h-3 w-56 bg-[#2a2a3a] rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return (
    <div className="text-center py-12 text-[#5a5a72]">User not found</div>
  )

  const hasFriendRequest = profile.friendRequest
  const isFriendRequestSent = hasFriendRequest?.senderId === session?.user?.id
  const isFriendRequestReceived = hasFriendRequest && hasFriendRequest.senderId !== session?.user?.id

  return (
    <div className="space-y-4">
      {editOpen && (
        <EditBioModal
          profile={profile}
          onSave={handleEditSaved}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Profile card */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        {/* Cover image */}
        <div className="relative h-40 bg-linear-to-r from-yellow-900/40 via-yellow-800/20 to-yellow-900/40">
          {profile.coverImage && (
            <Image
              src={profile.coverImage}
              alt="Cover"
              fill
              className="object-cover"
              unoptimized={profile.coverImage.startsWith('data:')}
            />
          )}
          {!profile.coverImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-yellow-500/5 blur-2xl" />
            </div>
          )}
          {isOwn && (
            <CoverUploadOverlay
              userId={userId}
              currentCover={profile.coverImage}
              onUpdated={handleCoverUpdated}
            />
          )}
        </div>

        <div className="px-4 pb-4">
          {/* Avatar + action buttons row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            {isOwn ? (
              <AvatarUploadOverlay
                userId={userId}
                currentImage={profile.image}
                currentName={profile.name}
                onUpdated={handleAvatarUpdated}
              />
            ) : (
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#0a0a0f]">
                <Avatar src={profile.image} name={profile.name} className="w-full h-full" />
              </div>
            )}

            <div className="flex gap-2 mb-1">
              {isOwn ? (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Profile
                </Button>
              ) : (
                <>
                  {hasFriendRequest?.status === 'accepted' ? (
                    <Button variant="secondary" size="sm">
                      <UserCheck className="w-4 h-4" /> Friends
                    </Button>
                  ) : isFriendRequestSent ? (
                    <Button variant="secondary" size="sm" onClick={() => handleFriendRequest('cancel')} loading={actionLoading}>
                      Cancel Request
                    </Button>
                  ) : isFriendRequestReceived ? (
                    <Button variant="gold" size="sm" onClick={() => handleFriendRequest('accept')} loading={actionLoading}>
                      <UserCheck className="w-4 h-4" /> Accept
                    </Button>
                  ) : (
                    <Button variant="gold" size="sm" onClick={() => handleFriendRequest('send')} loading={actionLoading}>
                      <UserPlus className="w-4 h-4" /> Add Trader
                    </Button>
                  )}
                  <Button
                    variant={profile.isFollowing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={handleFollow}
                    loading={actionLoading}
                  >
                    {profile.isFollowing
                      ? <><UserMinus className="w-4 h-4" /> Unfollow</>
                      : <><UserPlus className="w-4 h-4" /> Follow</>
                    }
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name & bio */}
          <h1 className="text-xl font-bold text-[#f0f0f8]">{profile.name}</h1>
          <p className="text-sm text-yellow-500">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm text-[#9090a8] leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#5a5a72]">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{profile.location}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 transition-colors">
                <Globe className="w-3.5 h-3.5" />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />Joined {timeAgo(profile.createdAt)}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-[#2a2a3a]">
            {[
              { label: 'Posts',     value: profile._count.posts     },
              { label: 'Followers', value: profile._count.followers },
              { label: 'Following', value: profile._count.following },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-bold text-[#f0f0f8]">{s.value}</p>
                <p className="text-xs text-[#5a5a72]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-10 text-center">
          <p className="text-[#5a5a72] text-sm">No posts yet.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={session?.user?.id || ''}
            onDelete={handlePostDeleted}
          />
        ))
      )}
    </div>
  )
}
