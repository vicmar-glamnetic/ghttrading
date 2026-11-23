import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifyMentions } from '@/lib/mentions'
import { extractMentions } from '@/lib/mentionText'

/** Edit your own comment or reply. Anyone newly @mentioned in the edit is notified. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, commentId } = await params
    const { content } = await req.json().catch(() => ({}))
    const text = typeof content === 'string' ? content.trim() : ''
    if (!text) return NextResponse.json({ error: 'Comment can’t be empty' }, { status: 400 })

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true, content: true, post: { select: { groupId: true } } },
    })
    if (!comment || comment.postId !== postId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (comment.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await db.comment.update({
      where: { id: commentId },
      data: { content: text.slice(0, 5000) },
      select: { id: true, content: true, updatedAt: true },
    })

    const before = new Set(extractMentions(comment.content))
    const added = extractMentions(text).filter(n => !before.has(n))
    if (added.length) {
      await notifyMentions({
        text: added.map(n => `@${n}`).join(' '), senderId: session.user.id, senderName: session.user.name,
        link: `/posts/${postId}`, where: 'comment', groupId: comment.post.groupId,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[COMMENT_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { commentId } = await params

    const comment = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true } })
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (comment.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.comment.delete({ where: { id: commentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[COMMENT_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
