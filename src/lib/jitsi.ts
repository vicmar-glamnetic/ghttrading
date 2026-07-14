// Helpers for the interactive "Live room" (Jitsi). The room is embedded with
// Jitsi's external_api.js (see components/LiveRoom.tsx) — coaches present,
// members join receive-only and watch + chat. The actual room domain / JWT is
// decided server-side in /api/live/token.

// Toolbar shown to members (non-moderators). They start muted and have no
// camera/screenshare — but they DO get a mic button so a coach can mute /
// unmute them (and they can speak when the coach lets them). Coaches keep the
// full default toolbar (camera, screenshare, moderator controls).
export const MEMBER_TOOLBAR = ['microphone', 'chat', 'raisehand', 'tileview', 'fullscreen', 'settings', 'hangup'] as const

// A hard-to-guess room slug so outsiders can't stumble into a session.
export function randomRoomName(): string {
  const rand = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `GHTLive-${rand}`
}
