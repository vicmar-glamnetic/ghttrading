'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ReactorsModal } from '@/components/posts/ReactorsModal'
import { timeAgo, formatNumber, cn } from '@/lib/utils'
import { REACTIONS, getReaction } from '@/lib/reactions'
import { useReactionPicker } from '@/lib/useReactionPicker'
import {
  ThumbsUp, MessageCircle, MoreHorizontal,
  TrendingUp, TrendingDown, BarChart2, BookOpen,
  Globe, Lock, Users, Play, Trash2, Flag, BadgeCheck, Pencil,
} from 'lucide-react'
import type { PostWithDetails, ReactionSummary } from '@/types'

// Optimistically apply a reaction change to a per-type count summary.
function mutateSummary(list: ReactionSummary[], prev: string | null, next: string | null): ReactionSummary[] {
  const map = new Map(list.map(r => [r.type, r.count]))
  if (prev) map.set(prev, (map.get(prev) ?? 1) - 1)
  if (next) map.set(next, (map.get(next) ?? 0) + 1)
  return [...map.entries()]
    .filter(([, c]) => c > 0)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

interface PostCardProps {
  post: PostWithDetails
  currentUserId: string
  onDelete?: (postId: string) => void
}

const categoryConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'signal-buy':  { label: 'BUY Signal',  className: 'badge-buy',       icon: TrendingUp  },
  'signal-sell': { label: 'SELL Signal', className: 'badge-sell',      icon: TrendingDown },
  'analysis':    { label: 'Analysis',    className: 'badge-analysis',  icon: BarChart2   },
  'education':   { label: 'Education',   className: 'badge-education', icon: BookOpen    },
}

function isVideo(url: string) {
  return url.startsWith('data:video') || /\.(mp4|mov|webm|avi)$/i.test(url)
}

// ---------- Post menu (three-dot) ----------
function PostMenu({ postId, isOwner, onEdit, onDelete }: { postId: string; isOwner: boolean; onEdit?: () => void; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) onDelete?.(postId)
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  if (!isOwner) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 hover:bg-elevated rounded-lg transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-ink3" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-elevated border border-line rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={() => { setOpen(false); onEdit?.() }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ink2 hover:bg-elevated hover:text-ink transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Post
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting…' : 'Delete Post'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Comment row ----------
type CommentType = PostWithDetails['comments'][number]
type ReplyType = CommentType['replies'][number]

// Inline reaction control for a single comment/reply — a hover picker plus a
// running count, mirroring the post reaction behaviour on a smaller scale.
function CommentReactions({
  postId,
  commentId,
  likes,
  count,
}: {
  postId: string
  commentId: string
  likes: { type: string | null }[]
  count: number
}) {
  const [myReaction, setMyReaction] = useState<string | null>((likes ?? [])[0]?.type ?? null)
  const [total, setTotal] = useState(count)
  const { open, ref, close, triggerProps, pickerProps, consumeLongPress } = useReactionPicker()

  async function react(sent: string) {
    const prev = myReaction
    const next = prev === sent ? null : sent
    const delta = next ? (prev ? 0 : 1) : -1

    setMyReaction(next)
    setTotal(c => c + delta)
    close()

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: sent }),
      })
      if (!res.ok) throw new Error('reaction failed')
    } catch {
      setMyReaction(prev)
      setTotal(c => c - delta)
    }
  }

  const current = myReaction ? getReaction(myReaction) : null

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 select-none" {...triggerProps}>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 z-40 flex items-center gap-1 px-2 py-1.5 bg-elevated border border-line rounded-full shadow-2xl"
          {...pickerProps}
        >
          {REACTIONS.map(r => (
            <button
              key={r.type}
              onClick={() => react(r.type)}
              title={r.label}
              className={cn(
                'text-xl leading-none transition-transform hover:scale-125 hover:-translate-y-0.5',
                myReaction === r.type && 'scale-110',
              )}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { if (consumeLongPress()) return; react(myReaction ?? 'like') }}
        className={cn('font-semibold transition-colors', current ? 'text-yellow-500' : 'text-ink3 hover:text-ink2')}
      >
        {current ? current.label : 'Like'}
      </button>
      {total > 0 && (
        <span className="flex items-center gap-0.5 text-ink3">
          <span className="text-[11px] leading-none">{getReaction(myReaction ?? 'like').emoji}</span>
          {formatNumber(total)}
        </span>
      )}
    </div>
  )
}

// ---------- Reply row (one level deep, no further nesting) ----------
function ReplyRow({
  reply,
  postId,
  currentUserId,
  onDelete,
}: {
  reply: ReplyType
  postId: string
  currentUserId: string
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const isOwner = reply.author.id === currentUserId

  async function handleDelete() {
    if (!confirm('Delete this reply?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${reply.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(reply.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex gap-2 group">
      <Link href={`/profile/${reply.author.id}`}>
        <Avatar src={reply.author.image} name={reply.author.name} size="xs" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-elevated rounded-2xl px-3 py-2 border border-line">
          <Link href={`/profile/${reply.author.id}`} className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            {reply.author.name}
          </Link>
          <p className="text-sm text-ink mt-0.5 wrap-break-word">{reply.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 pl-3 text-[11px]">
          <CommentReactions postId={postId} commentId={reply.id} likes={reply.likes} count={reply._count.likes} />
          <span className="text-ink3">{timeAgo(reply.createdAt)}</span>
        </div>
      </div>
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 self-center p-1.5 hover:bg-red-500/10 rounded-lg transition-all text-ink3 hover:text-red-400 disabled:opacity-50"
          title="Delete reply"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function CommentRow({
  comment,
  postId,
  currentUserId,
  onDelete,
  onCountChange,
}: {
  comment: CommentType
  postId: string
  currentUserId: string
  onDelete: (id: string) => void
  onCountChange: (delta: number) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replies, setReplies] = useState<ReplyType[]>(comment.replies ?? [])
  const isOwner = comment.author.id === currentUserId

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(comment.id)
    } finally {
      setDeleting(false)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parentId: comment.id }),
      })
      const newReply = await res.json()
      setReplies(prev => [...prev, newReply])
      setReplyText('')
      setShowReplyBox(false)
      onCountChange(1)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReplyDelete(replyId: string) {
    setReplies(prev => prev.filter(r => r.id !== replyId))
    onCountChange(-1)
  }

  return (
    <div className="flex gap-2 group">
      <Link href={`/profile/${comment.author.id}`}>
        <Avatar src={comment.author.image} name={comment.author.name} size="xs" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-elevated rounded-2xl px-3 py-2 border border-line">
          <Link href={`/profile/${comment.author.id}`} className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            {comment.author.name}
          </Link>
          <p className="text-sm text-ink mt-0.5 wrap-break-word">{comment.content}</p>
        </div>

        {/* Meta actions: react · reply · timestamp */}
        <div className="flex items-center gap-3 mt-1 pl-3 text-[11px]">
          <CommentReactions postId={postId} commentId={comment.id} likes={comment.likes} count={comment._count.likes} />
          <button
            onClick={() => setShowReplyBox(v => !v)}
            className="font-semibold text-ink3 hover:text-ink2 transition-colors"
          >
            Reply
          </button>
          <span className="text-ink3">{timeAgo(comment.createdAt)}</span>
        </div>

        {/* Reply composer */}
        {showReplyBox && (
          <form onSubmit={handleReply} className="flex gap-2 mt-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author.name}…`}
              autoFocus
              className="flex-1 bg-elevated border border-line focus:border-yellow-500/50 rounded-xl px-3 py-1.5 text-sm outline-none text-ink placeholder-ink3 transition-colors"
            />
            <Button type="submit" variant="gold" size="sm" loading={submitting} disabled={!replyText.trim()}>
              Reply
            </Button>
          </form>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map(reply => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                postId={postId}
                currentUserId={currentUserId}
                onDelete={handleReplyDelete}
              />
            ))}
          </div>
        )}
      </div>
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 self-start p-1.5 hover:bg-red-500/10 rounded-lg transition-all text-ink3 hover:text-red-400 disabled:opacity-50"
          title="Delete comment"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ---------- Main PostCard ----------
export function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [myReaction, setMyReaction] = useState<string | null>((post.likes ?? [])[0]?.type ?? null)
  const [reactions, setReactions] = useState<ReactionSummary[]>(post.reactions ?? [])
  const [totalReactions, setTotalReactions] = useState(post._count?.likes ?? 0)
  const {
    open: pickerOpen,
    ref: pickerRef,
    close: closePicker,
    triggerProps: pickerTriggerProps,
    pickerProps,
    consumeLongPress,
  } = useReactionPicker()
  const [showReactors, setShowReactors] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [localComments, setLocalComments] = useState(post.comments ?? [])
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0)
  const [visible, setVisible] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [content, setContent] = useState(post.content)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.content)
  const [savingEdit, setSavingEdit] = useState(false)

  // Only images go into the lightbox; videos stay inline
  const imageUrls = (post.images ?? []).filter(m => !isVideo(m))

  const isOwner = post.author.id === currentUserId
  const category = post.feeling && categoryConfig[post.feeling] ? categoryConfig[post.feeling] : null
  const CategoryIcon = category?.icon

  function handlePostDelete(id: string) {
    setVisible(false)
    onDelete?.(id)
  }

  function startEdit() {
    setDraft(content)
    setEditing(true)
  }

  async function handleEditSave() {
    const trimmed = draft.trim()
    if (!trimmed || savingEdit) return
    if (trimmed === content) { setEditing(false); return }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (res.ok) {
        setContent(trimmed)
        setEditing(false)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  // `sent` is the reaction type we POST. The server toggles it off when it
  // matches the current reaction, so mirror that here for optimistic state.
  async function sendReaction(sent: string) {
    const prev = myReaction
    const next = prev === sent ? null : sent
    const delta = next ? (prev ? 0 : 1) : -1

    setMyReaction(next)
    setReactions(list => mutateSummary(list, prev, next))
    setTotalReactions(c => c + delta)
    closePicker()

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: sent }),
      })
      if (!res.ok) throw new Error('reaction failed')
    } catch {
      setMyReaction(prev)
      setReactions(list => mutateSummary(list, next, prev))
      setTotalReactions(c => c - delta)
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
      setCommentCount(c => c + 1)
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  function handleCommentDelete(commentId: string) {
    setLocalComments(prev => prev.filter(c => c.id !== commentId))
    setCommentCount(c => Math.max(0, c - 1))
  }

  if (!visible) return null

  return (
    <div className="bg-surface rounded-xl border border-line hover:border-line2 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          {post.group ? (
            <Link href={`/groups/${post.group.id}`}>
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-line flex items-center justify-center overflow-hidden shrink-0">
                {post.group.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={post.group.image} alt={post.group.name} className="w-full h-full object-cover" />
                  : <Users className="w-5 h-5 text-yellow-500" />}
              </div>
            </Link>
          ) : post.page ? (
            <Link href={`/pages/${post.page.id}`}>
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-line flex items-center justify-center overflow-hidden shrink-0">
                {post.page.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={post.page.image} alt={post.page.name} className="w-full h-full object-cover" />
                  : <Flag className="w-5 h-5 text-yellow-500" />}
              </div>
            </Link>
          ) : (
            <Link href={`/profile/${post.author.id}`}>
              <Avatar src={post.author.image} name={post.author.name} size="md" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              {post.group ? (
                <Link href={`/groups/${post.group.id}`} className="font-semibold text-sm text-ink hover:text-yellow-500 transition-colors">
                  {post.group.name}
                </Link>
              ) : post.page ? (
                <div className="flex items-center gap-1">
                  <Link href={`/pages/${post.page.id}`} className="font-semibold text-sm text-ink hover:text-yellow-500 transition-colors">
                    {post.page.name}
                  </Link>
                  {post.page.verified && <BadgeCheck className="w-3.5 h-3.5 text-yellow-500" />}
                </div>
              ) : (
                <Link href={`/profile/${post.author.id}`} className="font-semibold text-sm text-ink hover:text-yellow-500 transition-colors">
                  {post.author.name}
                </Link>
              )}
              {category && CategoryIcon && (
                <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold', category.className)}>
                  <CategoryIcon className="w-3 h-3" />
                  {category.label}
                </span>
              )}
            </div>
            {(post.group || post.page) && (
              <p className="text-[11px] text-ink3">
                by{' '}
                <Link href={`/profile/${post.author.id}`} className="hover:text-yellow-500 transition-colors">
                  {post.author.name}
                </Link>
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-ink3 mt-0.5">
              <span>{timeAgo(post.createdAt)}</span>
              {!post.group && !post.page && (
                <>
                  <span>·</span>
                  {post.privacy === 'public' ? <Globe className="w-3 h-3" /> : post.privacy === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </>
              )}
            </div>
          </div>
        </div>
        <PostMenu postId={post.id} isOwner={isOwner} onEdit={startEdit} onDelete={handlePostDelete} />
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-xl px-3 py-2 text-sm outline-none text-ink placeholder-ink3 transition-colors resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button variant="gold" size="sm" onClick={handleEditSave} loading={savingEdit} disabled={!draft.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </div>

      {/* Media */}
      {(post.images ?? []).length > 0 && (
        <div className={cn('gap-0.5', post.images.length === 1 ? 'block' : 'grid grid-cols-2')}>
          {post.images.slice(0, 4).map((media, i) => {
            const imgIndexInLightbox = imageUrls.indexOf(media)
            return (
              <div key={i} className={cn('relative bg-app overflow-hidden', post.images.length === 1 ? 'aspect-video' : 'aspect-square')}>
                {isVideo(media) ? (
                  /* ── Video stays inline ── */
                  <div className="relative w-full h-full group">
                    <video src={media} className="w-full h-full object-cover" controls={false} />
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all cursor-pointer"
                      onClick={e => {
                        const v = e.currentTarget.previousElementSibling as HTMLVideoElement
                        v.paused ? v.play() : v.pause()
                      }}
                    >
                      <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-yellow-500/50">
                        <Play className="w-5 h-5 text-yellow-500 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Image opens lightbox ── */
                  <button
                    className="relative w-full h-full group block"
                    onClick={() => setLightboxIndex(imgIndexInLightbox)}
                    type="button"
                  >
                    {media.startsWith('data:') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Image src={media} alt="" fill className="object-cover" />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {/* "+N more" badge on 4th tile */}
                    {i === 3 && post.images.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-black">
                        +{post.images.length - 4}
                      </div>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Image lightbox portal */}
      {lightboxIndex !== null && imageUrls.length > 0 && (
        <ImageLightbox
          images={imageUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Stats */}
      {(totalReactions > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-line">
          {totalReactions > 0 && (
            <button
              onClick={() => setShowReactors(true)}
              className="flex items-center gap-1.5 text-xs text-ink3 hover:text-yellow-500 transition-colors"
            >
              <span className="flex -space-x-1">
                {(reactions.length ? reactions : [{ type: 'like', count: totalReactions }])
                  .slice(0, 3)
                  .map(r => (
                    <span
                      key={r.type}
                      className="w-4 h-4 rounded-full bg-elevated border border-line flex items-center justify-center text-[10px] leading-none"
                    >
                      {getReaction(r.type).emoji}
                    </span>
                  ))}
              </span>
              {formatNumber(totalReactions)}
            </button>
          )}
          {commentCount > 0 && (
            <button onClick={() => setShowComments(!showComments)} className="text-xs text-ink3 hover:text-yellow-500 transition-colors ml-auto">
              {formatNumber(commentCount)} comment{commentCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-line">
        {/* Like / reaction — hover (desktop) or long-press (mobile) reveals the picker; a tap likes */}
        <div
          ref={pickerRef}
          className="relative flex-1 select-none"
          {...pickerTriggerProps}
        >
          {pickerOpen && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 flex items-center gap-1 px-2 py-1.5 bg-elevated border border-line rounded-full shadow-2xl"
              {...pickerProps}
            >
              {REACTIONS.map(r => (
                <button
                  key={r.type}
                  onClick={() => sendReaction(r.type)}
                  title={r.label}
                  className={cn(
                    'text-2xl leading-none transition-transform hover:scale-125 hover:-translate-y-0.5',
                    myReaction === r.type && 'scale-110',
                  )}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          {(() => {
            const current = myReaction ? getReaction(myReaction) : null
            return (
              <button
                onClick={() => { if (consumeLongPress()) return; sendReaction(myReaction ?? 'like') }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors',
                  current ? 'text-yellow-500' : 'text-ink3 hover:text-ink2 hover:bg-elevated',
                )}
              >
                {current ? (
                  <span className="text-base leading-none">{current.emoji}</span>
                ) : (
                  <ThumbsUp className="w-4 h-4" fill="none" />
                )}
                {current ? current.label : 'Like'}
              </button>
            )
          })()}
        </div>

        {/* Comment */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors',
            showComments ? 'text-yellow-500' : 'text-ink3 hover:text-ink2 hover:bg-elevated',
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
      </div>

      {/* Who reacted modal */}
      {showReactors && (
        <ReactorsModal postId={post.id} onClose={() => setShowReactors(false)} />
      )}

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-line bg-[#12121a]">
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-elevated border border-line focus:border-yellow-500/50 rounded-xl px-4 py-2 text-sm outline-none text-ink placeholder-ink3 transition-colors"
            />
            <Button type="submit" variant="gold" size="sm" loading={submittingComment} disabled={!commentText.trim()}>
              Post
            </Button>
          </form>
          {localComments.map(comment => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={post.id}
              currentUserId={currentUserId}
              onDelete={handleCommentDelete}
              onCountChange={(delta) => setCommentCount(c => Math.max(0, c + delta))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
