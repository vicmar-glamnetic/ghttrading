import { NextResponse, after } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'
import { sendPushToAll } from '@/lib/push'
import { resolveFacebookUrl } from '@/lib/fbResolve'

// Coaches/admins set the live webinar stream + toggle it live.
export async function PUT(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const prev = await db.liveWebinar.findUnique({ where: { id: 'default' }, select: { isLive: true } })

  const { title, embedUrl, isLive } = await req.json()
  let cleanUrl = embedUrl?.toString().trim() || null
  if (cleanUrl && /facebook\.com|fb\.watch/.test(cleanUrl)) cleanUrl = await resolveFacebookUrl(cleanUrl)
  const data = {
    title: title?.toString().trim() || null,
    embedUrl: cleanUrl,
    isLive: Boolean(isLive),
  }

  const webinar = await db.liveWebinar.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  })

  // Alert everyone when a session goes live (only on the off→on transition).
  if (webinar.isLive && !prev?.isLive) {
    const who = session.user.name?.split(' ')[0] || 'A coach'
    const authorId = session.user.id
    after(async () => {
      await sendPushToAll({
        title: '🔴 We\'re live now',
        body: webinar.title ? `${who}: ${webinar.title} — join the session.` : `${who} just started a live session. Tap to join.`,
        url: '/live',
        tag: 'live-webinar',
      }, authorId).catch(() => {})
    })
  }

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
