import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Live webinar state. Any logged-in member can read.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webinar = await db.liveWebinar.findUnique({ where: { id: 'default' } })
  return NextResponse.json({
    webinar: webinar ?? { isLive: false, mode: 'webinar', embedUrl: null, title: null, roomName: null },
  })
}
