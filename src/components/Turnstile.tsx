'use client'
import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

// Cloudflare Turnstile bot check. Renders nothing if no site key is configured
// (the server-side verify is skipped too, so signup still works).
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (!SITE_KEY) return
    function render() {
      if (!window.turnstile || !ref.current || rendered.current) return
      rendered.current = true
      window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }
    if (window.turnstile) { render(); return }
    const id = 'cf-turnstile-script'
    let s = document.getElementById(id) as HTMLScriptElement | null
    if (!s) {
      s = document.createElement('script')
      s.id = id
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.addEventListener('load', render)
      document.head.appendChild(s)
    } else {
      s.addEventListener('load', render)
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={ref} className="flex justify-center" />
}
