// Presence: users' open tabs POST /api/presence on an interval, stamping
// users.lastSeenAt. Anything fresher than ONLINE_WINDOW_MS counts as online.

/** How often an open tab heartbeats. */
export const HEARTBEAT_MS = 60_000

/**
 * A user is "online" if we heard from them inside this window. It has to be a
 * comfortable multiple of HEARTBEAT_MS — one dropped or slow beat shouldn't
 * flip someone to offline.
 */
export const ONLINE_WINDOW_MS = 5 * 60_000

/**
 * Don't rewrite lastSeenAt on every beat. Skipping writes newer than this
 * collapses duplicate tabs and stray refreshes into ~one write per minute.
 * Must stay below HEARTBEAT_MS or normal beats get skipped and users go stale.
 */
export const HEARTBEAT_WRITE_THROTTLE_MS = 45_000

export function isOnline(lastSeenAt: string | Date | null | undefined): boolean {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
}

/** Short "when were they last around" label, e.g. "Online", "12m ago", "3d ago". */
export function lastSeenLabel(lastSeenAt: string | Date | null | undefined): string {
  if (!lastSeenAt) return 'Never'
  if (isOnline(lastSeenAt)) return 'Online'

  const mins = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
