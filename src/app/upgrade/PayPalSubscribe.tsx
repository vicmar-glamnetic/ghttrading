'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PayPalButtonsConfig {
  style: Record<string, string>
  createSubscription: (data: unknown, actions: { subscription: { create: (opts: Record<string, unknown>) => Promise<string> } }) => Promise<string>
  onApprove: (data: { subscriptionID?: string | null }) => void
  onError?: (err: unknown) => void
}
declare global {
  interface Window {
    paypal?: { Buttons: (cfg: PayPalButtonsConfig) => { render: (sel: string | HTMLElement) => void } }
  }
}

export function PayPalSubscribe({ clientId, planId, userId }: { clientId: string; planId: string; userId: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'activating' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (rendered.current) return

    function renderButtons() {
      if (!window.paypal || !containerRef.current || rendered.current) return
      rendered.current = true
      window.paypal
        .Buttons({
          style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'subscribe' },
          createSubscription: (_data, actions) =>
            actions.subscription.create({ plan_id: planId, custom_id: userId }),
          onApprove: async (data) => {
            setStatus('activating')
            try {
              const res = await fetch('/api/paypal/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId: data.subscriptionID }),
              })
              if (res.ok) {
                setStatus('done')
                router.replace('/')
                router.refresh()
              } else {
                setStatus('error')
              }
            } catch {
              setStatus('error')
            }
          },
          onError: () => setStatus('error'),
        })
        .render(containerRef.current)
    }

    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (window.paypal) {
      renderButtons()
    } else if (script) {
      script.addEventListener('load', renderButtons)
    } else {
      script = document.createElement('script')
      script.src = src
      script.async = true
      script.addEventListener('load', renderButtons)
      script.addEventListener('error', () => setStatus('error'))
      document.body.appendChild(script)
    }
  }, [clientId, planId, userId, router])

  return (
    <div>
      <div ref={containerRef} />
      {status === 'activating' && <p className="text-xs text-ink3 mt-2 text-center">Activating your membership…</p>}
      {status === 'done' && <p className="text-xs text-green-400 mt-2 text-center">You&apos;re in! Redirecting…</p>}
      {status === 'error' && <p className="text-xs text-red-400 mt-2 text-center">Something went wrong. If you were charged, contact support and we&apos;ll activate you.</p>}
    </div>
  )
}
