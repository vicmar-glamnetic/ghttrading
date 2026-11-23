'use client'
import { useState, useEffect, use, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MapPin, Globe, Calendar, UserPlus, UserCheck, UserMinus, Camera, Pencil, X, Check, BadgeCheck, Lock, MessageCircle } from 'lucide-react'
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


function AvatarUploadOverlay({ userId, currentImage, currentName, onUpdated, onView }: {
  userId: string
  currentImage: string | null
  currentName: string | null
  onUpdated: (url: string) => void
  onView: () => void
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
      {/* Tapping the photo views it full size; with no photo yet, it picks one. */}
      <button
        type="button"
        onClick={currentImage ? onView : pick}
        disabled={uploading}
        aria-label={currentImage ? 'View profile photo' : 'Add profile photo'}
        className="relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:cursor-wait"
      >
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-app bg-elevated">
          {/* Always use Avatar — it handles data: URLs and image errors internally */}
          <Avatar src={currentImage} name={currentName} className="w-full h-full" />
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      {/* The camera badge changes the photo */}
      {!uploading && (
        <button
          type="button"
          onClick={pick}
          aria-label="Change profile photo"
          title="Change profile photo"
          className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-yellow-500 hover:bg-yellow-400 ring-2 ring-app flex items-center justify-center shadow transition-colors focus:outline-none focus-visible:ring-yellow-300"
        >
          <Camera className="w-3.5 h-3.5 text-black" />
        </button>
      )}
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
  const [viewingPhoto, setViewingPhoto] = useState(false)
  const [viewingCover, setViewingCover] = useState(false)
  const [tab, setTab] = useState<'posts' | 'photos'>('posts')
  // Keyed by user so moving between profiles never shows the last one's photos.
  const [photoData, setPhotoData] = useState<{ userId: string; list: { url: string; postId: string }[] } | null>(null)
  const photos = photoData?.userId === userId ? photoData.list : null
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)

  // Photos load the first time the tab is opened.
  useEffect(() => {
    if (tab !== 'photos' || photos) return
    const done = (list: { url: string; postId: string }[]) => setPhotoData({ userId, list })
    fetch(`/api/users/${userId}/photos`).then(r => r.ok ? r.json() : []).then(d => done(Array.isArray(d) ? d : [])).catch(() => done([]))
  }, [tab, photos, userId])
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
      {viewingPhoto && profile.image && (
        <ImageLightbox images={[profile.image]} startIndex={0} onClose={() => setViewingPhoto(false)} />
      )}
      {viewingCover && profile.coverImage && (
        <ImageLightbox images={[profile.coverImage]} startIndex={0} onClose={() => setViewingCover(false)} />
      )}
      {photoIndex !== null && photos && photos.length > 0 && (
        <ImageLightbox images={photos.map(p => p.url)} startIndex={photoIndex} onClose={() => setPhotoIndex(null)} />
      )}

      {editOpen && (
        <EditBioModal
          profile={profile}
          onSave={handleEditSaved}
          onClose={() => setEditOpen(false)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        {/* ── Profile panel ─────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-20 overflow-hidden rounded-xl border border-line bg-surface">
          {/* Cover — an uploaded image, or a faint chart line in gold */}
          <div className="relative h-32 sm:h-36 bg-sunken">
            {profile.coverImage ? (
              <button type="button" onClick={() => setViewingCover(true)} aria-label="View cover photo" className="absolute inset-0 cursor-zoom-in focus:outline-none">
                <Image
                  src={profile.coverImage}
                  alt="Cover"
                  fill
                  className="object-cover"
                  unoptimized={profile.coverImage.startsWith('data:')}
                />
              </button>
            ) : (
              <svg aria-hidden className="absolute inset-0 h-full w-full text-yellow-500/25" preserveAspectRatio="none" viewBox="0 0 340 140">
                <defs>
                  <pattern id="pgrid" width="34" height="28" patternUnits="userSpaceOnUse">
                    <path d="M34 0H0V28" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="340" height="140" fill="url(#pgrid)" />
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  points="0,110 26,96 48,102 70,80 92,86 118,62 140,70 162,48 188,58 210,36 236,44 258,28 284,38 308,20 340,26"
                />
              </svg>
            )}
            {isOwn && (
              <CoverUploadOverlay userId={userId} currentCover={profile.coverImage} onUpdated={handleCoverUpdated} />
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-12 mb-3 flex items-end justify-between">
              <div className="relative">
                {isOwn ? (
                  <AvatarUploadOverlay
                    userId={userId}
                    currentImage={profile.image}
                    currentName={profile.name}
                    onUpdated={handleAvatarUpdated}
                    onView={() => setViewingPhoto(true)}
                  />
                ) : profile.image ? (
                  <button
                    type="button"
                    onClick={() => setViewingPhoto(true)}
                    aria-label={`View ${profile.name || 'profile'} photo`}
                    className="block h-24 w-24 overflow-hidden rounded-full ring-4 ring-surface cursor-zoom-in focus:outline-none focus-visible:ring-yellow-500"
                  >
                    <Avatar src={profile.image} name={profile.name} className="h-full w-full" />
                  </button>
                ) : (
                  <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-surface">
                    <Avatar src={profile.image} name={profile.name} className="h-full w-full" />
                  </div>
                )}
                {isOnline(profile.lastSeenAt) && (
                  <span
                    title="Online now"
                    aria-label="Online now"
                    className={`absolute bottom-1 h-5 w-5 rounded-full border-4 border-surface bg-green-400 ${isOwn ? 'left-1' : 'right-1'}`}
                  />
                )}
              </div>
              {isOwn && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>

            {/* Name */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight text-ink">{profile.name}</h1>
              {profile.role && profile.role !== 'member' && (
                <span className="rounded-full border border-yellow-500/40 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-500">
                  {profile.role}
                </span>
              )}
              {profile.accmVerifyStatus === 'verified' && (
                <span
                  title="Broker account verified by the team"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/25 rounded-full px-2 py-0.5"
                >
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-yellow-500">@{profile.username}</p>
            <p className="mt-1 text-xs text-ink3">
              {isOnline(profile.lastSeenAt) ? (
                <span className="inline-flex items-center gap-1.5 text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Online now
                </span>
              ) : profile.lastSeenAt ? (
                <>Last seen {lastSeenLabel(profile.lastSeenAt).toLowerCase()}</>
              ) : null}
            </p>

            {profile.bio && <p className="mt-3 text-sm leading-relaxed text-ink2">{profile.bio}</p>}

            {/* Actions for someone else's profile */}
            {!isOwn && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {hasFriendRequest?.status === 'accepted' ? (
                  <Button variant="secondary" size="sm" className="w-full">
                    <UserCheck className="h-4 w-4" /> Friends
                  </Button>
                ) : isFriendRequestSent ? (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => handleFriendRequest('cancel')} loading={actionLoading}>
                    Cancel Request
                  </Button>
                ) : isFriendRequestReceived ? (
                  <Button variant="gold" size="sm" className="w-full" onClick={() => handleFriendRequest('accept')} loading={actionLoading}>
                    <UserCheck className="h-4 w-4" /> Accept
                  </Button>
                ) : (
                  <Button variant="gold" size="sm" className="w-full" onClick={() => handleFriendRequest('send')} loading={actionLoading}>
                    <UserPlus className="h-4 w-4" /> Add Trader
                  </Button>
                )}
                <Button
                  variant={profile.isFollowing ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={handleFollow}
                  loading={actionLoading}
                >
                  {profile.isFollowing ? <><UserMinus className="h-4 w-4" /> Unfollow</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                </Button>
                {/* Opens (or creates) the 1-on-1 thread — /chat?dm= does the get-or-create. */}
                <Link
                  href={`/chat?dm=${profile.id}`}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-elevated px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-line"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </Link>
              </div>
            )}
          </div>

          {/* Stat strip */}
          <dl className="grid grid-cols-3 border-y border-line">
            {[
              { label: 'Posts', value: profile._count.posts },
              { label: 'Followers', value: profile._count.followers },
              { label: 'Following', value: profile._count.following },
            ].map((st, i) => (
              <div key={st.label} className={`px-3 py-3 text-center ${i > 0 ? 'border-l border-line' : ''}`}>
                <dd className="text-xl font-bold tabular-nums text-ink">{st.value}</dd>
                <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-ink3">{st.label}</dt>
              </div>
            ))}
          </dl>

          {/* Details */}
          <ul className="space-y-2 px-5 py-4 text-xs text-ink2">
            {profile.location && (
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-ink3" />{profile.location}</li>
            )}
            {profile.website && (
              <li className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-ink3" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="truncate text-yellow-500 hover:text-yellow-400">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-ink3" />Joined {timeAgo(profile.createdAt)}</li>
            {/* accmNumber is only sent to the owner, so this can't leak. */}
            {isOwn && profile.accmNumber && (
              <li className="flex items-center gap-2 font-semibold text-yellow-500"><BadgeCheck className="h-3.5 w-3.5" />ACCM #{profile.accmNumber}</li>
            )}
            {/* realName is only sent to the owner and to staff, so this can't leak. */}
            {profile.realName && (
              <li className="flex items-center gap-2" title={isOwn ? 'Only you, the coaches and the admins can see this' : 'Visible to staff only'}>
                <Lock className="h-3.5 w-3.5 text-ink3" />{profile.realName}
                <span className="text-[10px] uppercase text-ink3">private</span>
              </li>
            )}
          </ul>
        </aside>

        {/* ── Posts ─────────────────────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <div role="tablist" className="flex items-center gap-5 border-b border-line">
            {([['posts', 'Posts'], ['photos', 'Photos']] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-2 text-lg font-bold transition-colors ${tab === key ? 'border-yellow-500 text-ink' : 'border-transparent text-ink3 hover:text-ink2'}`}>
                {label}
                {key === 'posts' && <span className="ml-1.5 text-[11px] font-normal text-ink3">{profile._count.posts}</span>}
              </button>
            ))}
          </div>
          {tab === 'photos' ? (
            photos === null ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square rounded bg-surface border border-line animate-pulse" />)}
              </div>
            ) : photos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <p className="text-sm text-ink3">{isOwn ? 'Photos you post will show up here.' : 'No photos yet.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {photos.map((ph, i) => (
                  <button key={`${ph.postId}-${i}`} type="button" onClick={() => setPhotoIndex(i)}
                    className="relative aspect-square overflow-hidden rounded bg-sunken group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500">
                    {/* eslint-disable-next-line @next/next/no-img-element -- mixed hosts and data: URLs */}
                    <img src={ph.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-10 text-center">
              <p className="text-sm text-ink3">{isOwn ? 'You haven’t posted yet. Share a chart or an idea from the Feed.' : 'No posts yet.'}</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} currentUserId={session?.user?.id || ''} onDelete={handlePostDeleted} />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
