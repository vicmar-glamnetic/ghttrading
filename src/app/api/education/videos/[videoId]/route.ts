import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { resolveFacebookUrl } from '@/lib/fbResolve'

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

// Coaches/admins edit a video (title, URL, educator, category).
export async function PATCH(req: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { videoId } = await params
  const video = await db.educatorVideo.findUnique({ where: { id: videoId }, select: { authorId: true } })
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role !== 'admin' && video.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, embedUrl, educator, category } = await req.json()
  if (!title?.trim() || !embedUrl?.trim()) {
    return NextResponse.json({ error: 'Title and video URL are required' }, { status: 400 })
  }
  let url = embedUrl.trim()
  if (/facebook\.com|fb\.watch/.test(url)) url = await resolveFacebookUrl(url)

  const updated = await db.educatorVideo.update({
    where: { id: videoId },
    data: {
      title: title.trim(),
      embedUrl: url,
      educator: educator?.toString().trim() || null,
      category: category?.toString().trim() || null,
    },
    include: { author: AUTHOR },
  })
  return NextResponse.json(updated)
}

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
