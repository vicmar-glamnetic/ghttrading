import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deriveTrade } from '@/lib/journal'
import { sanitizeSetups } from '@/lib/setups'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const entries = await db.journalEntry.findMany({
      where: { authorId: session.user.id },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
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

    const body = await req.json()
    const { title, content, mood, symbol, direction, result, tradedAt, setup, chartUrl } = body
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    const trade = deriveTrade({ ...body, symbol, direction, result })

    const entry = await db.journalEntry.create({
      data: {
        title,
        content,
        mood,
        symbol: symbol || null,
        direction: direction || null,
        result: result || null,
        tradedAt: tradedAt ? new Date(tradedAt) : null,
        setup: sanitizeSetups(setup),
        chartUrl: chartUrl || null,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopPrice: trade.stopPrice,
        targetPrice: trade.targetPrice,
        lots: trade.lots,
        pnl: trade.pnl,
        rMultiple: trade.rMultiple,
        authorId: session.user.id,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('[JOURNAL_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
