import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const entries = await db.journalEntry.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('[JOURNAL_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, content, mood } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    const entry = await db.journalEntry.create({
      data: { title, content, mood, authorId: session.user.id },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('[JOURNAL_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
