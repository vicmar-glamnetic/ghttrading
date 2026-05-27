import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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
