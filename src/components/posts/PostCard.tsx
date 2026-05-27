'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { timeAgo, formatNumber, cn } from '@/lib/utils'
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, TrendingUp, TrendingDown, BarChart2, BookOpen, Globe, Lock, Users, Play } from 'lucide-react'
import type { PostWithDetails } from '@/types'

interface PostCardProps {
  post: PostWithDetails
  currentUserId: string
}

const categoryConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'signal-buy': { label: 'BUY Signal', className: 'badge-buy', icon: TrendingUp },
  'signal-sell': { label: 'SELL Signal', className: 'badge-sell', icon: TrendingDown },
  'analysis': { label: 'Analysis', className: 'badge-analysis', icon: BarChart2 },
  'education': { label: 'Education', className: 'badge-education', icon: BookOpen },
}

function isVideo(url: string) {
  return url.startsWith('data:video') || /\.(mp4|mov|webm|avi)$/i.test(url)
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const [liked, setLiked] = useState(post.likes.some(l => l.userId === currentUserId))
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [localComments, setLocalComments] = useState(post.comments)

  const category = post.feeling && categoryConfig[post.feeling] ? categoryConfig[post.feeling] : null
  const CategoryIcon = category?.icon

  async function handleLike() {
    const prev = liked
    setLiked(!liked)
    setLikeCount(c => liked ? c - 1 : c + 1)
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
    } catch {
      setLiked(prev)
      setLikeCount(c => !liked ? c - 1 : c + 1)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      })
      const newComment = await res.json()
      setLocalComments(prev => [newComment, ...prev])
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] hover:border-[#3a3a4a] overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar src={post.author.image} name={post.author.name} size="md" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/profile/${post.author.id}`} className="font-semibold text-sm text-[#f0f0f8] hover:text-yellow-500 transition-colors">
                {post.author.name}
              </Link>
              {category && CategoryIcon && (
                <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold', category.className)}>
                  <CategoryIcon className="w-3 h-3" />
                  {category.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#5a5a72] mt-0.5">
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              {post.privacy === 'public' ? <Globe className="w-3 h-3" /> : post.privacy === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            </div>
          </div>
        </div>
        <button className="p-1.5 hover:bg-[#1e1e2c] rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4 text-[#5a5a72]" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-[#e0e0f0] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Media */}
      {post.images.length > 0 && (
        <div className={cn('gap-0.5', post.images.length === 1 ? 'block' : 'grid grid-cols-2')}>
          {post.images.slice(0, 4).map((media, i) => (
            <div key={i} className={cn('relative bg-[#0a0a0f]', post.images.length === 1 ? 'aspect-video' : 'aspect-square')}>
              {isVideo(media) ? (
                <div className="relative w-full h-full group">
                  <video src={media} className="w-full h-full object-cover" controls={false} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all cursor-pointer"
                    onClick={e => { const v = e.currentTarget.previousElementSibling as HTMLVideoElement; v.paused ? v.play() : v.pause() }}>
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-yellow-500/50">
                      <Play className="w-5 h-5 text-yellow-500 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
              ) : (
                <Image src={media} alt="" fill className="object-cover" />
              )}
              {i === 3 && post.images.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-bold">
                  +{post.images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {(likeCount > 0 || post._count.comments > 0) && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#2a2a3a]">
          {likeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-[#5a5a72]">
              <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-black" fill="currentColor" />
              </span>
              {formatNumber(likeCount)}
            </span>
          )}
          {post._count.comments > 0 && (
            <button onClick={() => setShowComments(!showComments)}
              className="text-xs text-[#5a5a72] hover:text-yellow-500 transition-colors ml-auto">
              {formatNumber(post._count.comments)} comments
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex border-t border-[#2a2a3a] mx-0">
        {[
          { icon: ThumbsUp, label: liked ? 'Liked' : 'Like', active: liked, onClick: handleLike, filled: liked },
          { icon: MessageCircle, label: 'Comment', active: false, onClick: () => setShowComments(!showComments), filled: false },
          { icon: Share2, label: 'Share', active: false, onClick: () => {}, filled: false },
        ].map(({ icon: Icon, label, active, onClick, filled }) => (
          <button key={label} onClick={onClick}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors',
              active ? 'text-yellow-500' : 'text-[#5a5a72] hover:text-[#9090a8] hover:bg-[#1e1e2c]'
            )}>
            <Icon className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} />
            {label}
          </button>
        ))}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-[#2a2a3a] bg-[#12121a]">
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-xl px-4 py-2 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] transition-colors"
            />
            <Button type="submit" variant="gold" size="sm" loading={submittingComment} disabled={!commentText.trim()}>
              Post
            </Button>
          </form>
          {localComments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <Link href={`/profile/${comment.author.id}`}>
                <Avatar src={comment.author.image} name={comment.author.name} size="xs" />
              </Link>
              <div className="flex-1 bg-[#1e1e2c] rounded-2xl px-3 py-2 border border-[#2a2a3a]">
                <Link href={`/profile/${comment.author.id}`} className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
                  {comment.author.name}
                </Link>
                <p className="text-sm text-[#e0e0f0] mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
