import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function tally(ideaId: string, me: string) {
  const [take, skip, mine] = await Promise.all([
    db.signalVote.count({ where: { ideaId, vote: 'take' } }),
    db.signalVote.count({ where: { ideaId, vote: 'skip' } }),
    db.signalVote.findUnique({ where: { ideaId_userId: { ideaId, userId: me } }, select: { vote: true } }),
  ])
  return { take, skip, mine: mine?.vote ?? null }
}

// Cast / toggle a "taking" vs "skipping" vote on a signal.
export async function POST(req: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id
  const { ideaId } = await params
  const { vote } = await req.json()
  if (vote !== 'take' && vote !== 'skip') return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })

  const existing = await db.signalVote.findUnique({ where: { ideaId_userId: { ideaId, userId: me } } })
  if (existing?.vote === vote) {
    await db.signalVote.delete({ where: { ideaId_userId: { ideaId, userId: me } } }) // toggle off
  } else {
    await db.signalVote.upsert({
      where: { ideaId_userId: { ideaId, userId: me } },
      create: { ideaId, userId: me, vote },
      update: { vote },
    })
  }
  return NextResponse.json(await tally(ideaId, me))
}
