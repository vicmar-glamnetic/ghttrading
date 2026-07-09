import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { resolveFacebookUrl } from '@/lib/fbResolve'

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

  const { title, embedUrl, educator, category } = await req.json()
  if (!title?.trim() || !embedUrl?.trim()) {
    return NextResponse.json({ error: 'Title and video URL are required' }, { status: 400 })
  }
  let url = embedUrl.trim()
  if (/facebook\.com|fb\.watch/.test(url)) url = await resolveFacebookUrl(url)

  const video = await db.educatorVideo.create({
    data: {
      title: title.trim(),
      embedUrl: url,
      educator: educator?.toString().trim() || session.user.name || null,
      category: category?.toString().trim() || null,
      authorId: session.user.id!,
    },
    include: { author: AUTHOR },
  })
  return NextResponse.json(video, { status: 201 })
}
