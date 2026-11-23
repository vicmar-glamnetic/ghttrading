import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { STORY_BACKGROUNDS, STORY_TEXT_MAX, STORY_TTL_HOURS, type StoryGroup } from '@/lib/stories'

/**
 * Stories still up (posted in the last 24h), grouped by author.
 * Order: your own first, then people with something you haven't seen
 * (newest first), then the ones you've watched.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id

  const stories = await db.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, image: true } },
      views: { where: { viewerId: me }, select: { id: true, reaction: true } },
      _count: { select: { views: true } },
    },
    take: 500,
  })

  const groups = new Map<string, StoryGroup & { latest: number }>()
  for (const s of stories) {
    const mine = s.authorId === me
    const g = groups.get(s.authorId) ?? { author: s.author, stories: [], allSeen: true, isMine: mine, latest: 0 }
    const seen = mine || s.views.length > 0
    g.stories.push({
      id: s.id,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType === 'video' ? 'video' : s.mediaType === 'image' ? 'image' : null,
      text: s.text,
      bg: s.bg,
      createdAt: s.createdAt.toISOString(),
      seen,
      ...(mine ? { viewCount: s._count.views } : { myReaction: s.views[0]?.reaction ?? null }),
    })
    if (!seen) g.allSeen = false
    g.latest = Math.max(g.latest, s.createdAt.getTime())
    groups.set(s.authorId, g)
  }

  const list = [...groups.values()].sort((a, b) =>
    Number(b.isMine) - Number(a.isMine) ||
    Number(a.allSeen) - Number(b.allSeen) ||
    b.latest - a.latest)

  return NextResponse.json({ groups: list.map(({ latest: _latest, ...g }) => g) })
}

/** Post a story: a photo/video (with an optional caption) or a text card. */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : ''
  const mediaType = body.mediaType === 'video' ? 'video' : body.mediaType === 'image' ? 'image' : null
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, STORY_TEXT_MAX) : ''
  const bg = typeof body.bg === 'string' && STORY_BACKGROUNDS[body.bg] ? body.bg : null

  if (mediaUrl) {
    // Only our own Blob uploads — never an arbitrary URL.
    let host = ''
    try { host = new URL(mediaUrl).hostname } catch {}
    if (!host.endsWith('.public.blob.vercel-storage.com') || !mediaType) {
      return NextResponse.json({ error: 'Upload the photo or video again.' }, { status: 400 })
    }
  } else if (!text) {
    return NextResponse.json({ error: 'Add a photo, a video or some text.' }, { status: 400 })
  }

  const story = await db.story.create({
    data: {
      authorId: session.user.id,
      mediaUrl: mediaUrl || null,
      mediaType: mediaUrl ? mediaType : null,
      text: text || null,
      bg: mediaUrl ? null : bg,
      expiresAt: new Date(Date.now() + STORY_TTL_HOURS * 3600_000),
    },
  })
  return NextResponse.json({ id: story.id }, { status: 201 })
}
