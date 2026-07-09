// Resolve a Facebook link to a canonical, embeddable video URL. Facebook's
// share links (/share/v/<code>/) and story links can't be embedded directly —
// the Video plugin needs a real video id. We follow the redirect and extract it.

function extractFbId(s: string): string | null {
  const m = s.match(/\/videos\/(?:live\/)?(\d+)/) || s.match(/[?&](?:v|story_fbid)=(\d+)/)
  return m ? m[1] : null
}

export async function resolveFacebookUrl(url: string): Promise<string> {
  if (!url) return url
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^m\./, 'www.')
    if (!host.includes('facebook.com') && host !== 'fb.watch') return url

    // Already a canonical video URL with an id → normalise to a clean watch URL.
    const direct = extractFbId(url)
    if (direct) return `https://www.facebook.com/watch/?v=${direct}`

    // Share/story/short link → follow the redirect and pull the id out.
    const res = await fetch(u.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    const id = extractFbId(res.url || '')
    if (id) return `https://www.facebook.com/watch/?v=${id}`
    return res.url || url
  } catch {
    return url
  }
}
