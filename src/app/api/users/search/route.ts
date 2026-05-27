import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    if (!q) return NextResponse.json([])

    const users = await db.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: session.user.id },
      },
      select: { id: true, name: true, image: true, username: true, bio: true },
      take: 10,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('[USERS_SEARCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
