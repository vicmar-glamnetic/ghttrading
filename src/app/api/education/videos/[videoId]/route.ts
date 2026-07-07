import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

export async function DELETE(_req: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { videoId } = await params
  const video = await db.educatorVideo.findUnique({ where: { id: videoId }, select: { authorId: true } })
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role !== 'admin' && video.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.educatorVideo.delete({ where: { id: videoId } })
  return NextResponse.json({ success: true })
}
