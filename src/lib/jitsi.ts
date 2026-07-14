// Build an embeddable Jitsi room URL. Jitsi Meet is free, open-source group
// video (camera/mic/screenshare) with no per-participant billing — we embed it
// in an iframe on /live.
//
// Room shape = "stage": coaches (moderators) speak/present; members join
// receive-only (muted, no camera, no mic/screen buttons) and watch + use the
// in-room chat + raise hand. This keeps 20–30 person classes light and orderly.
//
// The room name is only handed to logged-in members (via the token route), so
// it isn't publicly discoverable, but public rooms are open to anyone who knows
// the name — use a hard-to-guess slug (see randomRoomName).

export interface RoomOpts {
  moderator: boolean
  displayName?: string | null
}

// Shared #hash config applied to both the public meet.jit.si and self-host/JaaS
// URLs. Members get a locked-down, receive-only experience.
export function roomHashConfig({ moderator, displayName }: RoomOpts): string {
  const params = ['config.disableDeepLinking=true'] // stay in the iframe
  if (displayName) {
    // Jitsi expects a JSON-quoted string, then the whole hash is URL-encoded.
    params.push(`userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}`)
  }
  if (!moderator) {
    // Members: watch + chat only. Start muted/no-video and strip the
    // mic/camera/screenshare buttons so they can't publish.
    params.push('config.startWithAudioMuted=true')
    params.push('config.startWithVideoMuted=true')
    const memberToolbar = ['chat', 'raisehand', 'tileview', 'fullscreen', 'settings', 'hangup']
    params.push(`config.toolbarButtons=${encodeURIComponent(JSON.stringify(memberToolbar))}`)
  }
  return params.join('&')
}

// Free public meet.jit.si URL (used when JaaS/self-host isn't configured).
export function jitsiUrl(roomName: string, opts: RoomOpts): string {
  return `https://meet.jit.si/${encodeURIComponent(roomName)}#${roomHashConfig(opts)}`
}

// A hard-to-guess room slug so outsiders can't stumble into a session.
export function randomRoomName(): string {
  const rand = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `GHTLive-${rand}`
}
