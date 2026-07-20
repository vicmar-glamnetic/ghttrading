// Normalise common video URLs (YouTube, Vimeo, Facebook) to an embeddable form.
// Facebook videos are wrapped in the Video plugin and MUST be set to Public.
export function toEmbed(url: string): string {
  try {
    const raw = url.trim()
    const u = new URL(raw)
    const host = u.hostname.replace(/^m\./, 'www.') // normalise mobile hosts

    // YouTube
    if (host.includes('youtube.com')) {
      if (u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
      if (u.pathname.startsWith('/shorts/')) return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`
      if (u.pathname.startsWith('/live/')) return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`
      if (u.pathname.startsWith('/embed/')) return raw
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`

    // Vimeo
    if (host.includes('vimeo.com') && /^\/\d+/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`

    // Facebook / fb.watch — wrap in the Video plugin (video must be Public).
    if ((host.includes('facebook.com') || host === 'fb.watch') && !u.pathname.includes('/plugins/video.php')) {
      // The plugin rejects the /watch/?v=<id> form ("content isn't available"),
      // so rewrite a bare video id to the accepted /video.php?v=<id> form.
      const id = (u.pathname === '/watch/' || u.pathname === '/watch') ? u.searchParams.get('v') : null
      const canonical = id
        ? `https://www.facebook.com/video.php?v=${id}`
        : raw.replace('://m.facebook.com', '://www.facebook.com')
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical)}&show_text=false&autoplay=true`
    }

    return raw
  } catch {
    return url
  }
}
