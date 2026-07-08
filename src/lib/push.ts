import webpush from 'web-push'
import { db } from '@/lib/db'

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@ghttrading.co'

let configured = false
function ensureConfigured() {
  if (configured) return true
  if (!PUBLIC || !PRIVATE) return false
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
}

/**
 * Send a push notification to a set of users (all their subscribed devices).
 * Dead subscriptions (410/404) are pruned. No-ops if VAPID isn't configured.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return
  await deliver(await db.pushSubscription.findMany({ where: { userId: { in: userIds } } }), payload)
}

/** Broadcast to every subscribed device (optionally excluding one user). */
export async function sendPushToAll(payload: PushPayload, exceptUserId?: string) {
  const subs = await db.pushSubscription.findMany({
    where: exceptUserId ? { NOT: { userId: exceptUserId } } : {},
  })
  await deliver(subs, payload)
}

type Sub = { endpoint: string; p256dh: string; auth: string }

async function deliver(subs: Sub[], payload: PushPayload) {
  if (!ensureConfigured() || subs.length === 0) return

  const body = JSON.stringify(payload)
  const dead: string[] = []

  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) dead.push(s.endpoint)
    }
  }))

  if (dead.length) {
    await db.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } }).catch(() => {})
  }
}
