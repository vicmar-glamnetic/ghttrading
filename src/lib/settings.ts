import { db } from '@/lib/db'

/**
 * Site-wide switches an admin flips from /admin/settings, stored one row per
 * key in `app_settings`. Every key declares its own default here, so a database
 * with no rows yet (or a read that fails) behaves exactly like the code did
 * before the setting existed.
 */
export const SETTING_KEYS = {
  /** Email the community whenever a coach publishes a new public signal. */
  signalEmailAlerts: 'signalEmailAlerts',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

export const SETTING_DEFAULTS: Record<SettingKey, boolean> = {
  // Off until an admin turns it on — shipping this on would blast every
  // verified member the first time a coach posts.
  [SETTING_KEYS.signalEmailAlerts]: false,
}

/** One boolean setting, falling back to its default when unset. */
export async function getBoolSetting(key: SettingKey): Promise<boolean> {
  const row = await db.appSetting.findUnique({ where: { key }, select: { value: true } })
  if (!row) return SETTING_DEFAULTS[key]
  return row.value === 'true'
}

/** Every boolean setting at once — what the admin screen loads. */
export async function getAllBoolSettings(): Promise<Record<SettingKey, boolean>> {
  const rows = await db.appSetting.findMany({ select: { key: true, value: true } })
  const stored = new Map(rows.map(r => [r.key, r.value]))
  const out = { ...SETTING_DEFAULTS }
  for (const key of Object.keys(out) as SettingKey[]) {
    const v = stored.get(key)
    if (v != null) out[key] = v === 'true'
  }
  return out
}

export async function setBoolSetting(key: SettingKey, value: boolean) {
  await db.appSetting.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  })
}
