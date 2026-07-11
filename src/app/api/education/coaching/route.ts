import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/admin'

const COACH = { select: { id: true, name: true, image: true, username: true } }

// 1-on-1 coaching offers. Any logged-in member can view.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const offers = await db.coachingOffer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { coach: COACH },
  })
  return NextResponse.json(offers)
}

// Coaches/admins add an offer.
export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Only coaches can add coaching offers' }, { status: 403 })

  const { coachId, topic, coverage } = await req.json()
  if (!coachId || !topic?.trim()) {
    return NextResponse.json({ error: 'Coach and topic are required' }, { status: 400 })
  }

  const coach = await db.user.findFirst({ where: { id: coachId, role: 'coach' }, select: { id: true } })
  if (!coach) return NextResponse.json({ error: 'Selected coach not found' }, { status: 404 })

  const offer = await db.coachingOffer.create({
    data: { coachId, topic: topic.trim(), coverage: coverage?.toString().trim() || null },
    include: { coach: COACH },
  })
  return NextResponse.json(offer, { status: 201 })
}
