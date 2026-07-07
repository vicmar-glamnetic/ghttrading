import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Live webinar state + educator videos. Any logged-in member can read.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [webinar, videos] = await Promise.all([
    db.liveWebinar.findUnique({ where: { id: 'default' } }),
    db.educatorVideo.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, image: true, username: true } } },
    }),
  ])

  return NextResponse.json({
    webinar: webinar ?? { isLive: false, embedUrl: null, title: null },
    videos,
  })
}
