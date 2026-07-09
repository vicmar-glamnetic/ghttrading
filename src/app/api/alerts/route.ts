import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// List my price alerts.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const alerts = await db.priceAlert.findMany({
    where: { userId: session.user.id },
    orderBy: [{ triggered: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(alerts)
}

// Create a price alert.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const symbol = (body.symbol || 'XAUUSD').toString().trim().toUpperCase()
  const targetPrice = Number(body.targetPrice)
  const direction = body.direction === 'below' ? 'below' : 'above'
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })

  const count = await db.priceAlert.count({ where: { userId: session.user.id, triggered: false } })
  if (count >= 20) return NextResponse.json({ error: 'Alert limit reached (20). Remove some first.' }, { status: 400 })

  const alert = await db.priceAlert.create({ data: { userId: session.user.id, symbol, targetPrice, direction } })
  return NextResponse.json(alert, { status: 201 })
}

// Delete one of my alerts.
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (id) await db.priceAlert.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
