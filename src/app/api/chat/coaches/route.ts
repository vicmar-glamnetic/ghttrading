import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { USER_LITE } from '@/lib/chat'

// Coaches members can start a direct chat with.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const coaches = await db.user.findMany({
    where: { role: 'coach', id: { not: session.user.id } },
    orderBy: { name: 'asc' },
    select: USER_LITE.select,
  })
  return NextResponse.json(coaches)
}
