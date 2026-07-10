import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { extractYoutubeId, fetchVideoMeta } from '@/lib/youtube'

/**
 * Resolve a pasted YouTube URL into real metadata, so the builder never asks an
 * admin to retype a title YouTube already knows — and never accepts a dead video.
 */
export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { url } = await req.json().catch(() => ({ url: '' }))
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'Paste a YouTube URL.' }, { status: 400 })
  }

  const youtubeId = extractYoutubeId(url)
  if (!youtubeId) {
    return NextResponse.json({ error: "That doesn't look like a YouTube link." }, { status: 400 })
  }

  const meta = await fetchVideoMeta(youtubeId)
  if (!meta) {
    return NextResponse.json(
      { error: 'YouTube says that video is unavailable (deleted, private, or embedding is off).' },
      { status: 422 },
    )
  }

  return NextResponse.json(meta)
}
