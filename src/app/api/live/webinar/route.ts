import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

// Coaches/admins set the live webinar stream + toggle it live.
export async function PUT(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, embedUrl, isLive } = await req.json()
  const data = {
    title: title?.toString().trim() || null,
    embedUrl: embedUrl?.toString().trim() || null,
    isLive: Boolean(isLive),
  }

  const webinar = await db.liveWebinar.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  })

  return NextResponse.json(webinar)
}

// Coaches/admins remove the live stream (clears title/URL and takes it offline).
export async function DELETE() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cleared = { title: null, embedUrl: null, isLive: false }
  const webinar = await db.liveWebinar.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...cleared },
    update: cleared,
  })

  return NextResponse.json(webinar)
}
