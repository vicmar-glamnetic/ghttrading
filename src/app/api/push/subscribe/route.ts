import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Save (or refresh) the current device's push subscription.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await req.json()
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const authKey = sub?.keys?.auth
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth: authKey, userId: session.user.id },
    update: { p256dh, auth: authKey, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}

// Remove this device's subscription (turn alerts off).
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({}))
  if (endpoint) {
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } })
  }
  return NextResponse.json({ ok: true })
}
