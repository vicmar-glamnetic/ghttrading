'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/posts/PostCard'
import { MapPin, Globe, Calendar, UserPlus, UserCheck, UserMinus } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

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

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const { data: session } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const isOwn = userId === session?.user?.id

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-t-xl" />
        <div className="p-4 space-y-3">
          <div className="w-24 h-24 rounded-full bg-gray-200" />
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!profile) return <div className="text-center py-12">User not found</div>

  const hasFriendRequest = profile.friendRequest
  const isFriendRequestSent = hasFriendRequest?.senderId === session?.user?.id
  const isFriendRequestReceived = hasFriendRequest?.senderId !== session?.user?.id

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-r from-blue-400 to-blue-600">
          {profile.coverImage && (
            <Image src={profile.coverImage} alt="Cover" fill className="object-cover" />
          )}
        </div>

        <div className="px-4 pb-4">
          {/* Avatar + buttons */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="ring-4 ring-white rounded-full">
              <Avatar src={profile.image} name={profile.name} size="xl" />
            </div>
            <div className="flex gap-2 mb-1">
              {isOwn ? (
                <Button variant="secondary" size="sm">Edit Profile</Button>
              ) : (
                <>
                  {hasFriendRequest?.status === 'accepted' ? (
                    <Button variant="secondary" size="sm" loading={actionLoading}>
                      <UserCheck className="w-4 h-4" /> Friends
                    </Button>
                  ) : isFriendRequestSent ? (
                    <Button variant="secondary" size="sm" onClick={() => handleFriendRequest('cancel')} loading={actionLoading}>
                      Cancel Request
                    </Button>
                  ) : isFriendRequestReceived ? (
                    <Button size="sm" onClick={() => handleFriendRequest('accept')} loading={actionLoading}>
                      <UserCheck className="w-4 h-4" /> Accept
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleFriendRequest('send')} loading={actionLoading}>
                      <UserPlus className="w-4 h-4" /> Add Friend
                    </Button>
                  )}
                  <Button
                    variant={profile.isFollowing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={handleFollow}
                    loading={actionLoading}
                  >
                    {profile.isFollowing ? (
                      <><UserMinus className="w-4 h-4" /> Unfollow</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-gray-500 text-sm">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
            {profile.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{profile.location}</span>}
            {profile.website && <a href={profile.website} className="flex items-center gap-1 text-blue-600 hover:underline"><Globe className="w-4 h-4" />{profile.website}</a>}
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Joined {timeAgo(profile.createdAt)}</span>
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="font-bold">{profile._count.posts}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{profile._count.followers}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{profile._count.following}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.map((post) => (
        <PostCard key={(post as {id: string}).id} post={post as Parameters<typeof PostCard>[0]['post']} currentUserId={session?.user?.id || ''} />
      ))}
    </div>
  )
}
