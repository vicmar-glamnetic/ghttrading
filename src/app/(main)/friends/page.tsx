'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Users } from 'lucide-react'

interface FriendRequest {
  id: string
  sender: { id: string; name: string | null; image: string | null; username: string | null }
  receiver: { id: string; name: string | null; image: string | null; username: string | null }
  status: string
  createdAt: string
}

export default function FriendsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This would need a dedicated API endpoint for friend requests
    setLoading(false)
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Users className="w-6 h-6" /> Friends
        </h1>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No pending friend requests</p>
            <p className="text-gray-400 text-xs mt-1">When someone sends you a request, it will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <Link href={`/profile/${req.sender.id}`}>
                  <Avatar src={req.sender.image} name={req.sender.name} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${req.sender.id}`} className="font-semibold text-sm hover:underline">
                    {req.sender.name}
                  </Link>
                  <p className="text-xs text-gray-500">@{req.sender.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Accept</Button>
                  <Button variant="secondary" size="sm">Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
