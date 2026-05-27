'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { MediaUpload } from './MediaUpload'
import { TrendingUp, TrendingDown, BarChart2, BookOpen, MessageSquare, Image as ImageIcon } from 'lucide-react'

interface UploadedFile { url: string; name: string; type: string }

interface CreatePostProps {
  onPostCreated?: (post: unknown) => void
}

const categories = [
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'text-[#9090a8]' },
  { value: 'signal-buy', label: 'BUY Signal', icon: TrendingUp, color: 'text-green-400' },
  { value: 'signal-sell', label: 'SELL Signal', icon: TrendingDown, color: 'text-red-400' },
  { value: 'analysis', label: 'Analysis', icon: BarChart2, color: 'text-yellow-500' },
  { value: 'education', label: 'Education', icon: BookOpen, color: 'text-purple-400' },
]

const privacyOptions = [
  { value: 'public', label: 'Public' },
  { value: 'friends', label: 'Traders Only' },
]

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { data: session } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('discussion')
  const [privacy, setPrivacy] = useState('public')
  const [showMedia, setShowMedia] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<UploadedFile[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const images = mediaFiles.filter(f => f.type.startsWith('image')).map(f => f.url)
      const videos = mediaFiles.filter(f => f.type.startsWith('video')).map(f => f.url)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          images: [...images, ...videos],
          feeling: category !== 'discussion' ? category : null,
          privacy,
        }),
      })
      const post = await res.json()
      onPostCreated?.(post)
      setContent('')
      setMediaFiles([])
      setShowMedia(false)
      setCategory('discussion')
      setExpanded(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4">
      {!expanded ? (
        <>
          <div className="flex gap-3 items-center">
            <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
            <button onClick={() => setExpanded(true)}
              className="flex-1 bg-[#1e1e2c] hover:bg-[#24243a] border border-[#2a2a3a] hover:border-yellow-500/30 rounded-xl px-4 py-3 text-left text-sm text-[#5a5a72] transition-all">
              Share analysis, signals, or insights...
            </button>
          </div>
          <div className="flex gap-1 mt-3 pt-3 border-t border-[#2a2a3a]">
            {[
              { icon: TrendingUp, label: 'BUY Signal', color: 'text-green-400 hover:bg-green-400/10', onClick: () => { setCategory('signal-buy'); setExpanded(true) } },
              { icon: TrendingDown, label: 'SELL Signal', color: 'text-red-400 hover:bg-red-400/10', onClick: () => { setCategory('signal-sell'); setExpanded(true) } },
              { icon: BarChart2, label: 'Analysis', color: 'text-yellow-500 hover:bg-yellow-500/10', onClick: () => { setCategory('analysis'); setExpanded(true) } },
              { icon: ImageIcon, label: 'Media', color: 'text-purple-400 hover:bg-purple-400/10', onClick: () => { setShowMedia(true); setExpanded(true) } },
            ].map(({ icon: Icon, label, color, onClick }) => (
              <button key={label} onClick={onClick}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${color}`}>
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar src={session?.user?.image} name={session?.user?.name} size="md" />
            <div className="flex-1 space-y-2">
              {/* Category selector */}
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      category === cat.value
                        ? cat.value === 'signal-buy' ? 'badge-buy' : cat.value === 'signal-sell' ? 'badge-sell' : cat.value === 'analysis' ? 'badge-analysis' : cat.value === 'education' ? 'badge-education' : 'bg-[#1e1e2c] border-yellow-500/50 text-yellow-500'
                        : 'border-[#2a2a3a] text-[#5a5a72] hover:border-[#3a3a4a] hover:text-[#9090a8]'
                    }`}>
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={
                  category === 'signal-buy' ? 'Share your BUY signal details: pair, entry, TP, SL...' :
                  category === 'signal-sell' ? 'Share your SELL signal details: pair, entry, TP, SL...' :
                  category === 'analysis' ? 'Share your market analysis...' :
                  category === 'education' ? 'Share trading knowledge or tips...' :
                  'What\'s happening in the markets?'
                }
                className="w-full resize-none bg-transparent outline-none text-[#f0f0f8] placeholder-[#5a5a72] text-sm min-h-25 leading-relaxed"
                rows={4}
              />
            </div>
          </div>

          {(showMedia || mediaFiles.length > 0) && (
            <MediaUpload onUpload={setMediaFiles} existingFiles={mediaFiles} />
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowMedia(!showMedia)}
                className="p-2 hover:bg-[#1e1e2c] rounded-lg text-[#5a5a72] hover:text-yellow-500 transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <select value={privacy} onChange={e => setPrivacy(e.target.value)}
                className="bg-[#1e1e2c] border border-[#2a2a3a] rounded-lg px-2 py-1.5 text-xs text-[#9090a8] outline-none focus:border-yellow-500/50">
                {privacyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setExpanded(false); setShowMedia(false); setMediaFiles([]) }}>
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" loading={submitting} disabled={!content.trim()}>
                Post
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
