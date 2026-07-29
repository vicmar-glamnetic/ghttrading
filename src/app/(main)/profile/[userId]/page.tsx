'use client'
import { useState, useEffect, use, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MapPin, Globe, Calendar, UserPlus, UserCheck, UserMinus, Camera, Pencil, X, Check, BadgeCheck, Lock } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { isOnline, lastSeenLabel } from '@/lib/presence'
import { uploadToBlob, validateImage, friendlyUploadError } from '@/lib/upload'
import { updateMyProfile } from '@/lib/useMyProfile'
import { isGatedMember } from '@/lib/identity'
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
  role?: string
  createdAt: string
  lastSeenAt: string | null
  accmNumber?: string | null
  accmMember?: boolean
  accmVerifyStatus?: string
  // Sent only to the owner and to staff — see canSeeRealName() on the API side.
  realName?: string | null
  _count: { followers: number; following: number; posts: number }
  isFollowing: boolean
  friendRequest: { status: string; senderId: string } | null
}


function AvatarUploadOverlay({ userId, currentImage, currentName, onUpdated }: {
  userId: string
  currentImage: string | null
  currentName: string | null
  onUpdated: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) { setErr(invalid); return }
    setUploading(true)
    setErr('')
    try {
      const { url } = await uploadToBlob(file)
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated(data.image)
      } else {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Could not save your photo. Please try again.')
      }
    } catch (e) {
      setErr(friendlyUploadError(e))
    } finally {
      setUploading(false)
    }
  }

  function pick() { if (!uploading) inputRef.current?.click() }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={pick}
        disabled={uploading}
        aria-label="Change profile photo"
        className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:cursor-wait"
      >
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-app bg-elevated">
          {/* Always use Avatar — it handles data: URLs and image errors internally */}
          <Avatar src={currentImage} name={currentName} className="w-full h-full" />
        </div>
        {/* Full-cover dim + spinner while uploading, dim-on-hover otherwise */}
        <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {uploading
            ? <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            : <Camera className="w-5 h-5 text-white" />
          }
        </div>
        {/* Always-visible badge so it's obviously editable on touch devices */}
        {!uploading && (
          <span className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-yellow-500 ring-2 ring-app flex items-center justify-center shadow">
            <Camera className="w-3.5 h-3.5 text-black" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {err && <p className="absolute top-full left-0 mt-1.5 w-48 text-xs text-red-400">{err}</p>}
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
  const [err, setErr] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) { setErr(invalid); return }
    setUploading(true)
    setErr('')
    try {
      const { url } = await uploadToBlob(file)
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImage: url }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated(data.coverImage)
      } else {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Could not save your cover. Please try again.')
      }
    } catch (e) {
      setErr(friendlyUploadError(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { if (!uploading) inputRef.current?.click() }}
        disabled={uploading}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
      >
        {uploading
          ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
          : <><Camera className="w-3.5 h-3.5" /> {currentCover ? 'Change Cover' : 'Add Cover'}</>
        }
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {err && <p className="absolute bottom-3 left-3 max-w-[60%] bg-black/75 rounded px-2 py-1 text-xs text-red-300">{err}</p>}
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
  const [error, setError] = useState<string | null>(null)

  // An ACCM member's display name and number live behind the step-up-protected
  // identity form in Settings; this modal never touches them.
  const gated = isGatedMember({ role: profile.role, accmMember: profile.accmMember })

  async function handleSave() {
    const payload: Record<string, string> = {
      bio: bio.trim(),
      location: location.trim(),
      website: website.trim(),
      ...(gated ? {} : { name: name.trim() }),
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${profile.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        // Prefer the server's saved row so what shows matches what's stored.
        const saved = await res.json().catch(() => null)
        onSave(saved ?? payload)
        onClose()
      } else {
        const d = await res.json().catch(() => null)
        setError(d?.error || 'Could not save your changes. Please try again.')
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Edit Profile</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-elevated rounded-lg transition-colors text-ink3">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {[
            ...(gated ? [] : [{ label: 'Name', value: name, setter: setName, placeholder: 'Your name' }]),
            { label: 'Location', value: location, setter: setLocation, placeholder: 'City, Country' },
            { label: 'Website', value: website, setter: setWebsite, placeholder: 'https://...' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1">{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink placeholder-ink3 transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the community about yourself…"
              rows={3}
              className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink placeholder-ink3 resize-none transition-colors"
            />
          </div>
          {gated && (
            <div className="rounded-lg border border-line bg-elevated px-3 py-2.5">
              <p className="text-xs text-ink2 leading-relaxed">
                Your display name, real name and ACCM number are managed in{' '}
                <a href="/settings" className="font-semibold text-yellow-500 hover:underline">
                  Settings → Account identity
                </a>{' '}
                — changing them needs a code from your e-mail.
              </p>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>}
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
    if (!res.ok) { setActionLoading(false); return }
    const data = await res.json()
    setProfile(prev => {
      if (!prev) return prev
      if (action === 'send') return { ...prev, friendRequest: data }
      if (action === 'accept') return {
        ...prev,
        // Reflect the accepted state so the button flips to "Friends" instead
        // of falling back to "Add Trader". Accepting also creates a mutual follow.
        friendRequest: { status: 'accepted', senderId: prev.friendRequest?.senderId ?? userId },
        isFollowing: true,
      }
      // decline / cancel
      return { ...prev, friendRequest: null }
    })
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
    // The session JWT never re-reads `name`, so refresh the shared client cache
    // that the nav/sidebar/composers read from — otherwise the new name only
    // shows after a full reload.
    if (updated.name != null) updateMyProfile({ name: updated.name })
  }

  function handlePostDeleted(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="h-40 bg-elevated" />
          <div className="p-4 space-y-3">
            <div className="w-24 h-24 rounded-full bg-line -mt-12" />
            <div className="h-5 w-40 bg-line rounded" />
            <div className="h-3 w-56 bg-line rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return (
    <div className="text-center py-12 text-ink3">User not found</div>
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
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
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
            <div className="relative">
              {isOwn ? (
                <AvatarUploadOverlay
                  userId={userId}
                  currentImage={profile.image}
                  currentName={profile.name}
                  onUpdated={handleAvatarUpdated}
                />
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-app">
                  <Avatar src={profile.image} name={profile.name} className="w-full h-full" />
                </div>
              )}
              {isOnline(profile.lastSeenAt) && (
                <span
                  title="Online now"
                  aria-label="Online now"
                  className={`absolute bottom-1 w-5 h-5 rounded-full bg-green-400 border-4 border-app ${isOwn ? 'left-1' : 'right-1'}`}
                />
              )}
            </div>

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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-ink">{profile.name}</h1>
            {profile.accmVerifyStatus === 'verified' && (
              <span
                title="ACCM account verified by the team"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/25 rounded-full px-2 py-0.5"
              >
                <BadgeCheck className="w-3 h-3" /> Verified
              </span>
            )}
            {isOnline(profile.lastSeenAt) ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </span>
            ) : profile.lastSeenAt ? (
              // Members who predate presence tracking have no timestamp — say
              // nothing rather than "last seen never".
              <span className="text-[10px] text-ink3">Last seen {lastSeenLabel(profile.lastSeenAt).toLowerCase()}</span>
            ) : null}
          </div>
          <p className="text-sm text-yellow-500">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm text-ink2 leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-ink3">
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

          {/* Private details. The API only sends accmNumber to the owner and
              realName to the owner + staff, so rendering them here can't leak. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {isOwn && profile.accmNumber && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 rounded-lg px-2.5 py-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                ACCM #{profile.accmNumber}
              </span>
            )}
            {profile.realName && (
              <span
                title={isOwn ? 'Only you, the coaches and the admins can see this' : 'Visible to staff only'}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-elevated border border-line text-ink2 rounded-lg px-2.5 py-1"
              >
                <Lock className="w-3.5 h-3.5" />
                {profile.realName}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-line">
            {[
              { label: 'Posts',     value: profile._count.posts     },
              { label: 'Followers', value: profile._count.followers },
              { label: 'Following', value: profile._count.following },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-bold text-ink">{s.value}</p>
                <p className="text-xs text-ink3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center">
          <p className="text-ink3 text-sm">No posts yet.</p>
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
