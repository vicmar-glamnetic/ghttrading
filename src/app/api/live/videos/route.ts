import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

// Coaches/admins add educator videos.
export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, embedUrl, educator } = await req.json()
  if (!title?.trim() || !embedUrl?.trim()) {
    return NextResponse.json({ error: 'Title and video URL are required' }, { status: 400 })
  }

  const video = await db.educatorVideo.create({
    data: {
      title: title.trim(),
      embedUrl: embedUrl.trim(),
      educator: educator?.toString().trim() || session.user.name || null,
      authorId: session.user.id!,
    },
    include: { author: AUTHOR },
  })

  return NextResponse.json(video, { status: 201 })
}
