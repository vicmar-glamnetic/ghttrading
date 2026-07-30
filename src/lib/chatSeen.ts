// When each chat room was last read, per room ("community", "coach:<id>").
//
// Rooms have no per-user read receipts in the database — a room message is one
// row shared by everyone — so "have I seen this?" is answered on the device.
// It's kept per room on purpose: opening the community room must not clear the
// dot on a coach's room you haven't looked at.

const KEY = 'ght:roomSeen'
// Written by the older, single-timestamp version of this ("I opened /chat at
// T"). Used as the floor for rooms with no entry yet, so members upgrading
// don't come back to a dot on every room.
const LEGACY_KEY = 'ght:chatSeenAt'

// Marking a room read has to update the nav immediately — it polls on a 45s
// timer, and a dot that outlives the room being opened reads as broken.
export const SEEN_EVENT = 'ght:chat-seen'

type SeenMap = Record<string, number>

function read(): SeenMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function floor(): number {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem(LEGACY_KEY) || 0)
}

export function markRoomSeen(room: string) {
  if (typeof window === 'undefined') return
  const map = read()
  map[room] = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // Private mode / quota — the dot just stays until the next real read.
  }
  window.dispatchEvent(new Event(SEEN_EVENT))
}

// `lastAt` is the newest message in that room *not written by me*.
export function isRoomUnseen(room: string, lastAt: string | null | undefined, seen: SeenMap = read()) {
  if (!lastAt) return false
  return new Date(lastAt).getTime() > (seen[room] ?? floor())
}

export function anyRoomUnseen(rooms: Record<string, string> | undefined) {
  if (!rooms) return false
  const seen = read()
  return Object.entries(rooms).some(([room, lastAt]) => isRoomUnseen(room, lastAt, seen))
}
