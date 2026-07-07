import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

const AUTHOR = { select: { id: true, name: true, image: true, username: true } }

// Educator videos / tutorials. Any logged-in member can view.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const videos = await db.educatorVideo.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: AUTHOR },
  })
  return NextResponse.json(videos)
}

// Coaches/admins add videos.
export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Only coaches can add videos' }, { status: 403 })

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
