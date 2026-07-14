import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Lists everyone who reacted to a post, with their reaction type — powers the
// "who reacted" modal in the feed.
export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId } = await params

    const likes = await db.like.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    const counts: Record<string, number> = {}
    for (const l of likes) counts[l.type] = (counts[l.type] ?? 0) + 1

    return NextResponse.json({ total: likes.length, counts, reactors: likes })
  } catch (error) {
    console.error('[POST_REACTIONS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
