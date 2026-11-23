// Canonical ordering so a pair of users always maps to one conversation.
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export const USER_LITE = { select: { id: true, name: true, image: true, username: true } }

/** A chat photo must be one of our own Blob uploads, never an arbitrary URL. */
export function chatImage(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com') ? u.toString() : null
  } catch {
    return null
  }
}

/** One-line preview of a message, for lists and push alerts. */
export function messagePreview(m: { content: string; image?: string | null }) {
  return m.content || (m.image ? '📷 Photo' : '')
}
