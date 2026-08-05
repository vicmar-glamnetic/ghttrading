import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/admin'
import { relayDestinations, relaySignal, SAMPLE_SIGNAL } from '@/lib/signalRelay'

/**
 * The Telegram/Discord rooms a coach can post a signal into, and a test send.
 * Staff only — the destination list tells you which rooms exist, which is not
 * something a member needs to know. Only labels and ids cross the wire; chat
 * ids and webhook URLs stay on the server.
 */
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ destinations: relayDestinations() })
}

/**
 * Fires the sample signal at the picked rooms so a coach can prove the wiring
 * before a live setup depends on it. Body: { to?: string[] } — omit for all.
 */
export async function POST(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to } = await req.json().catch(() => ({}))
  const result = await relaySignal(SAMPLE_SIGNAL, {
    url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/ideas` : undefined,
    to: Array.isArray(to) ? to.filter((v): v is string => typeof v === 'string') : undefined,
  })
  return NextResponse.json(result)
}
