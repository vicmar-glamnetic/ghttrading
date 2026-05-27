'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { timeAgo, formatNumber } from '@/lib/utils'
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe, Users, Lock } from 'lucide-react'
import type { PostWithDetails } from '@/types'

interface PostCardProps {
  post: PostWithDetails
  currentUserId: string
}

const privacyIcons = { public: Globe, friends: Users, private: Lock }

type CommentType = PostWithDetails['comments'][number]

export function PostCard({ post, currentUserId }: PostCardProps) {
  const [liked, setLiked] = useState(post.likes.some((l: { userId: string }) => l.userId === currentUserId))
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [localComments, setLocalComments] = useState<CommentType[]>(post.comments)

  const PrivacyIcon = privacyIcons[post.privacy as keyof typeof privacyIcons] || Globe

  async function handleLike() {
    const prev = liked
    setLiked(!liked)
    setLikeCount((c: number) => liked ? c - 1 : c + 1)
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
    } catch {
      setLiked(prev)
      setLikeCount((c: number) => !liked ? c - 1 : c + 1)
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
      setLocalComments((prev: CommentType[]) => [newComment as CommentType, ...prev])
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar src={post.author.image} name={post.author.name} size="md" />
          </Link>
          <div>
            <Link href={`/profile/${post.author.id}`} className="font-semibold text-sm hover:underline">
              {post.author.name}
            </Link>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              <PrivacyIcon className="w-3 h-3" />
              {post.feeling && <span>· feeling {post.feeling}</span>}
              {post.location && <span>· 📍 {post.location}</span>}
            </div>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className={`grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.slice(0, 4).map((img: string, i: number) => (
            <div key={i} className="relative aspect-square bg-gray-100">
              <Image src={img} alt="" fill className="object-cover" />
              {i === 3 && post.images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                  +{post.images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {(likeCount > 0 || post._count.comments > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
          {likeCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </span>
              {formatNumber(likeCount)}
            </span>
          )}
          {post._count.comments > 0 && (
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">
              {formatNumber(post._count.comments)} comments
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex border-t border-gray-200 mx-4">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${liked ? 'text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-blue-600' : ''}`} />
          Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="sm" loading={submittingComment} disabled={!commentText.trim()}>
              Post
            </Button>
          </form>
          {localComments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <Link href={`/profile/${comment.author.id}`}>
                <Avatar src={comment.author.image} name={comment.author.name} size="xs" />
              </Link>
              <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2">
                <Link href={`/profile/${comment.author.id}`} className="text-xs font-semibold hover:underline">
                  {comment.author.name}
                </Link>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
