import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deriveTrade } from '@/lib/journal'
import { isKnownSetup } from '@/lib/setups'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params
    const entry = await db.journalEntry.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('[JOURNAL_ENTRY_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params
    const entry = await db.journalEntry.findUnique({ where: { id: entryId }, select: { authorId: true } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, content, mood, symbol, direction, result, tradedAt, setup, chartUrl } = body
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    const trade = deriveTrade({ ...body, symbol, direction, result })

    const updated = await db.journalEntry.update({
      where: { id: entryId },
      data: {
        title,
        content,
        mood,
        symbol: symbol || null,
        direction: direction || null,
        result: result || null,
        tradedAt: tradedAt ? new Date(tradedAt) : null,
        setup: isKnownSetup(setup) ? setup : null,
        chartUrl: chartUrl || null,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopPrice: trade.stopPrice,
        targetPrice: trade.targetPrice,
        lots: trade.lots,
        pnl: trade.pnl,
        rMultiple: trade.rMultiple,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[JOURNAL_ENTRY_PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params
    const entry = await db.journalEntry.findUnique({ where: { id: entryId }, select: { authorId: true } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.journalEntry.delete({ where: { id: entryId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[JOURNAL_ENTRY_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
