// Server-side YouTube metadata lookup for the course builder.
//
// Two sources, deliberately weighted differently:
//   • oEmbed is an official, stable endpoint — title/author come from it, and a
//     non-200 means the video is private, deleted, or the id is wrong. That is
//     our validity check: if oEmbed fails, we refuse to save the lesson.
//   • Duration is scraped from the watch page, because oEmbed doesn't expose it
//     and the Data API needs a key. Scraping is fragile by nature, so it is
//     strictly best-effort: a failure yields null and the lesson still saves.

export interface VideoMeta {
  youtubeId: string
  title: string
  educator: string
  durationSec: number | null
}

/** Pull the 11-char id out of any common YouTube URL, or accept a bare id. */
export function extractYoutubeId(input: string): string | null {
  const raw = input.trim()
  if (/^[\w-]{11}$/.test(raw)) return raw

  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^(m|www)\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      return /^[\w-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/)
      if (m) return m[2]
    }
  } catch {
    // not a URL
  }
  return null
}

/** Best-effort. Returns null rather than throwing — duration is never required. */
async function fetchDurationSec(youtubeId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/"lengthSeconds":"(\d+)"/)
    if (!m) return null
    const secs = Number(m[1])
    return Number.isFinite(secs) && secs > 0 ? secs : null
  } catch {
    return null
  }
}

/**
 * Verify a video exists and fetch what we can about it.
 * Returns null when the video can't be resolved — the caller must treat that as
 * "don't save this lesson", which is what keeps dead embeds out of a course.
 */
export async function fetchVideoMeta(youtubeId: string): Promise<VideoMeta | null> {
  let oembed: { title?: string; author_name?: string }
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null // 404 = gone/private, 401 = embedding disabled
    oembed = await res.json()
  } catch {
    return null
  }

  if (!oembed?.title) return null

  return {
    youtubeId,
    title: oembed.title,
    educator: oembed.author_name ?? '',
    durationSec: await fetchDurationSec(youtubeId),
  }
}

// Duration formatters live in lib/courses.ts — they're pure and the client
// renders them; this module reaches out to the network and must stay server-side.
