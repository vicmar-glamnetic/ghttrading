import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getAllBoolSettings, setBoolSetting, SETTING_DEFAULTS, type SettingKey } from '@/lib/settings'
import { countSignalEmailRecipients } from '@/lib/signalAlerts'

function isSettingKey(k: unknown): k is SettingKey {
  return typeof k === 'string' && k in SETTING_DEFAULTS
}

/** Current switch positions, plus the numbers the screen needs to explain them. */
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [settings, signalEmailRecipients] = await Promise.all([
    getAllBoolSettings(),
    countSignalEmailRecipients(),
  ])
  return NextResponse.json({ settings, signalEmailRecipients })
}

/** Flips one switch. Body: { key, value } — unknown keys are rejected. */
export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, value } = await req.json().catch(() => ({}))
  if (!isSettingKey(key)) return NextResponse.json({ error: 'Unknown setting' }, { status: 400 })
  if (typeof value !== 'boolean') return NextResponse.json({ error: 'Value must be true or false' }, { status: 400 })

  await setBoolSetting(key, value)
  return NextResponse.json({ settings: await getAllBoolSettings() })
}
