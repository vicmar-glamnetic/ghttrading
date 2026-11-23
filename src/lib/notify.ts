import { after } from 'next/server'
import { db } from '@/lib/db'
import { sendPushToUsers } from '@/lib/push'

type NotificationData = {
  type: string
  message: string
  receiverId: string
  senderId?: string | null
  link?: string | null
}

const pushFor = (d: NotificationData) => ({
  title: 'Gold Heist Trading',
  body: d.message,
  url: d.link ?? '/notifications',
  // One alert per thing per type: a second reaction on the same post replaces
  // the first on the lock screen instead of stacking.
  tag: `${d.type}:${d.link ?? ''}`,
})

/**
 * In-app notification plus a push to the receiver's devices. Takes the same
 * `{ data }` shape as db.notification.create. Never throws: a notification
 * hiccup must not fail the like/comment/follow that caused it.
 */
export async function notify({ data }: { data: NotificationData }) {
  try {
    await db.notification.create({ data })
  } catch (err) {
    console.error('[NOTIFY]', err)
    return
  }
  // Sent after the response, so a like/comment doesn't wait on push services.
  after(() => sendPushToUsers([data.receiverId], pushFor(data)).catch(err => console.error('[NOTIFY_PUSH]', err)))
}

/** Same as notify, for several receivers at once (e.g. everyone @mentioned). */
export async function notifyMany(list: NotificationData[]) {
  if (list.length === 0) return
  try {
    await db.notification.createMany({ data: list })
  } catch (err) {
    console.error('[NOTIFY]', err)
    return
  }
  after(() => Promise.all(list.map(d => sendPushToUsers([d.receiverId], pushFor(d)).catch(err => console.error('[NOTIFY_PUSH]', err)))))
}
