// Resolve a Facebook link to a canonical, embeddable video URL. Facebook's
// share links (/share/v/<code>/) and story links can't be embedded directly —
// the Video plugin needs a real video permalink. We follow the redirect and
// keep the resolved /<page>/videos/<id>/ URL.
//
// The plugin only accepts the full permalink form (/<page>/videos/<id>/) or the
// legacy /video.php?v=<id> form — the /watch/?v=<id> form renders as
// "This content isn't available right now", so we never emit it.

function extractFbId(s: string): string | null {
  const m = s.match(/\/videos\/(?:live\/)?(\d+)/) || s.match(/[?&](?:v|story_fbid)=(\d+)/)
  return m ? m[1] : null
}

// A full video permalink the plugin embeds directly, e.g. /<page>/videos/<id>/.
function permalinkPath(u: URL): string | null {
  const m = u.pathname.match(/^(\/.+\/videos\/(?:live\/)?\d+)\/?$/)
  return m ? m[1] : null
}

export async function resolveFacebookUrl(url: string): Promise<string> {
  if (!url) return url
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^m\./, 'www.')
    if (!host.includes('facebook.com') && host !== 'fb.watch') return url

    // Already a full /<page>/videos/<id>/ permalink → keep it (host-normalised).
    const path = host.includes('facebook.com') ? permalinkPath(u) : null
    if (path) return `https://www.facebook.com${path}/`

    // Has an id but no page slug (watch/?v=, ?v=, story_fbid) → use the legacy
    // /video.php?v=<id> form, which the plugin accepts.
    const direct = host.includes('facebook.com') ? extractFbId(url) : null
    if (direct) return `https://www.facebook.com/video.php?v=${direct}`

    // Share/story/short link → follow the redirect and keep the permalink it
    // resolves to (falling back to /video.php?v=<id> when we only get an id).
    const res = await fetch(u.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    const resolved = res.url ? new URL(res.url) : null
    const resolvedPath = resolved ? permalinkPath(resolved) : null
    if (resolvedPath) return `https://www.facebook.com${resolvedPath}/`

    const id = extractFbId(res.url || '')
    if (id) return `https://www.facebook.com/video.php?v=${id}`
    return res.url || url
  } catch {
    return url
  }
}
