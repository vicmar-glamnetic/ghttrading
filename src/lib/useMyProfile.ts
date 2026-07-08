'use client'
import { useEffect, useState } from 'react'

// Shared client-side cache of the current user's live avatar/name. The auth
// session strips large (base64) profile images to keep the cookie small, so
// "my own avatar" spots (nav, composers) read from /api/me instead — fetched
// once per page load and refreshed instantly when you update your photo.

interface Me { image: string | null; name: string | null }

let cache: Me | undefined // undefined = not loaded yet
let inflight: Promise<void> | null = null
const listeners = new Set<(m: Me) => void>()

function emit() { if (cache) listeners.forEach(l => l(cache!)) }

function load() {
  if (inflight) return inflight
  inflight = fetch('/api/me')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { cache = { image: d?.image ?? null, name: d?.name ?? null }; emit() })
    .catch(() => { cache = cache ?? { image: null, name: null }; emit() })
    .finally(() => { inflight = null })
  return inflight
}

/** Update the cached profile everywhere immediately (e.g. after an upload). */
export function updateMyProfile(next: Partial<Me>) {
  cache = { image: next.image ?? cache?.image ?? null, name: next.name ?? cache?.name ?? null }
  emit()
}

/**
 * Current user's avatar/name. Falls back to the passed session values until the
 * live copy loads, so there's no flicker to initials on first paint.
 */
export function useMyProfile(fallback?: { image?: string | null; name?: string | null }) {
  const [me, setMe] = useState<Me | undefined>(cache)
  useEffect(() => {
    const fn = (m: Me) => setMe(m)
    listeners.add(fn)
    if (cache === undefined) load()
    else setMe(cache)
    return () => { listeners.delete(fn) }
  }, [])
  return {
    image: me ? me.image : (fallback?.image ?? null),
    name: me?.name ?? fallback?.name ?? null,
  }
}
