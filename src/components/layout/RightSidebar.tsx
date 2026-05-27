'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

interface SuggestedUser {
  id: string
  name: string | null
  image: string | null
  username: string | null
  bio: string | null
}

export function RightSidebar() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])

  useEffect(() => {
    fetch('/api/users/search?q=a')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSuggestions(d.slice(0, 5)) })
      .catch(() => {})
  }, [])

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-2">
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="font-bold text-sm mb-3">People You May Know</h3>
          <div className="space-y-3">
            {suggestions.map(user => (
              <div key={user.id} className="flex items-center gap-2">
                <Link href={`/profile/${user.id}`}>
                  <Avatar src={user.image} name={user.name} size="sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.id}`} className="text-sm font-medium hover:underline truncate block">
                    {user.name}
                  </Link>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs py-1 px-2">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-xs text-gray-400 px-2 space-y-1">
        <p>© 2025 GHT Community</p>
        <p>community.ghttrading.co</p>
        <div className="flex flex-wrap gap-x-2">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/help" className="hover:underline">Help</Link>
        </div>
      </div>
    </aside>
  )
}
