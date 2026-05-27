'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Image as ImageIcon, Smile, MapPin, Globe, Users, Lock } from 'lucide-react'

interface CreatePostProps {
  onPostCreated?: (post: unknown) => void
}

const privacyOptions = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'friends', label: 'Friends', icon: Users },
  { value: 'private', label: 'Only me', icon: Lock },
]

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [feeling, setFeeling] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const feelings = ['😊 Happy', '😢 Sad', '😍 Loved', '🎉 Celebrating', '💪 Motivated', '😴 Tired', '🤔 Thinking']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, privacy, feeling: feeling || null, location: location || null }),
      })
      const post = await res.json()
      onPostCreated?.(post)
      setContent('')
      setFeeling('')
      setLocation('')
      setExpanded(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex gap-3 items-center">
        <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
        <button
          onClick={() => setExpanded(true)}
          className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 text-left text-sm text-gray-500 transition-colors"
        >
          What&apos;s on your mind, {session?.user?.name?.split(' ')[0]}?
        </button>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`What's on your mind, ${session?.user?.name?.split(' ')[0]}?`}
            className="w-full resize-none border-0 outline-none text-base min-h-[100px] placeholder-gray-400"
            rows={4}
          />

          {feeling && (
            <p className="text-sm text-gray-600">Feeling: {feeling}</p>
          )}
          {location && (
            <p className="text-sm text-gray-600">📍 {location}</p>
          )}

          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Add to your post</span>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none"
              >
                {privacyOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mb-3">
              <button type="button" className="flex items-center gap-1 text-sm text-green-600 hover:bg-green-50 p-2 rounded-lg">
                <ImageIcon className="w-5 h-5" /> Photo
              </button>
              <div className="relative group">
                <button type="button" className="flex items-center gap-1 text-sm text-yellow-500 hover:bg-yellow-50 p-2 rounded-lg">
                  <Smile className="w-5 h-5" /> Feeling
                </button>
                <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 hidden group-hover:flex flex-wrap gap-1 z-10 w-48">
                  {feelings.map(f => (
                    <button key={f} type="button" onClick={() => setFeeling(f)} className="text-xs px-2 py-1 hover:bg-gray-100 rounded">{f}</button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocation(prompt('Enter location:') || '')}
                className="flex items-center gap-1 text-sm text-red-500 hover:bg-red-50 p-2 rounded-lg"
              >
                <MapPin className="w-5 h-5" /> Location
              </button>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setExpanded(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={!content.trim()} className="flex-1">
                Post
              </Button>
            </div>
          </div>
        </form>
      )}

      {!expanded && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <ImageIcon className="w-5 h-5 text-green-500" /> Photo/Video
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Smile className="w-5 h-5 text-yellow-500" /> Feeling/Activity
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-red-500" /> Check In
          </button>
        </div>
      )}
    </div>
  )
}
