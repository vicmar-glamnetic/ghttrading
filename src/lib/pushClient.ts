'use client'

// Client-side Web Push helpers: register the service worker, subscribe the
// browser, and sync the subscription with the server.

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function getRegistration() {
  return navigator.serviceWorker.register('/sw.js')
}

/** Current permission + whether this device already has an active subscription. */
export async function getPushState(): Promise<{ permission: NotificationPermission; subscribed: boolean }> {
  if (!pushSupported()) return { permission: 'denied', subscribed: false }
  const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => null)
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return { permission: Notification.permission, subscribed: !!sub }
}

/** Request permission, subscribe, and save to the server. Returns true on success. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await getRegistration()
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID!),
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  })
  return res.ok
}

/** Unsubscribe this device and remove it from the server. */
export async function disablePush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => null)
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }
  return true
}
