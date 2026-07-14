'use client'
import { useEffect, useRef } from 'react'
import { MEMBER_TOOLBAR } from '@/lib/jitsi'

// Minimal typing for Jitsi's external_api.js global.
type JitsiApi = { dispose: () => void }
type JitsiApiCtor = new (domain: string, options: Record<string, unknown>) => JitsiApi
declare global {
  interface Window { JitsiMeetExternalAPI?: JitsiApiCtor }
}

export interface LiveRoomProps {
  domain: string       // "8x8.vc" (JaaS) or "meet.jit.si"
  roomName: string     // JaaS: "<appId>/<slug>"; public: "<slug>"
  jwt: string | null   // signed token for JaaS; null for public
  moderator: boolean   // coaches present; members are receive-only
  displayName: string
}

// Mounts a Jitsi room using external_api.js (the method JaaS documents). Coaches
// present; members join muted, camera off, with a watch-and-chat-only toolbar.
export function LiveRoom({ domain, roomName, jwt, moderator, displayName }: LiveRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let api: JitsiApi | null = null

    // external_api.js is served per-domain (and per-tenant for JaaS).
    const appId = domain === '8x8.vc' ? roomName.split('/')[0] : ''
    const scriptSrc = domain === '8x8.vc'
      ? `https://8x8.vc/${appId}/external_api.js`
      : `https://${domain}/external_api.js`

    function start() {
      if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return
      api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        jwt: jwt ?? undefined,
        userInfo: { displayName },
        configOverwrite: {
          disableDeepLinking: true,
          prejoinPageEnabled: moderator,       // coaches set up devices; members drop straight in
          startWithAudioMuted: !moderator,
          startWithVideoMuted: !moderator,
          ...(moderator ? {} : { toolbarButtons: [...MEMBER_TOOLBAR] }),
        },
      })
    }

    if (window.JitsiMeetExternalAPI) {
      start()
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = scriptSrc
        script.async = true
        document.body.appendChild(script)
      }
      script.addEventListener('load', start)
    }

    return () => {
      disposed = true
      api?.dispose()
    }
  }, [domain, roomName, jwt, moderator, displayName])

  return <div ref={containerRef} className="w-full h-full" />
}
