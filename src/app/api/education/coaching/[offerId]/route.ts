import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

const COACH = { select: { id: true, name: true, image: true, username: true } }

// Coaches/admins edit an offer. A coach may only edit their own; admins any.
export async function PATCH(req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { offerId } = await params
  const offer = await db.coachingOffer.findUnique({ where: { id: offerId }, select: { coachId: true } })
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role !== 'admin' && offer.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { coachId, topic, coverage } = await req.json()
  if (!coachId || !topic?.trim()) {
    return NextResponse.json({ error: 'Coach and topic are required' }, { status: 400 })
  }
  const coach = await db.user.findFirst({ where: { id: coachId, role: 'coach' }, select: { id: true } })
  if (!coach) return NextResponse.json({ error: 'Selected coach not found' }, { status: 404 })

  const updated = await db.coachingOffer.update({
    where: { id: offerId },
    data: { coachId, topic: topic.trim(), coverage: coverage?.toString().trim() || null },
    include: { coach: COACH },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { offerId } = await params
  const offer = await db.coachingOffer.findUnique({ where: { id: offerId }, select: { coachId: true } })
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role !== 'admin' && offer.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.coachingOffer.delete({ where: { id: offerId } })
  return NextResponse.json({ success: true })
}
