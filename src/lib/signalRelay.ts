/**
 * Mirrors a published signal out to the rooms members actually sit in —
 * Telegram groups and Discord channels — in the same shorthand a coach would
 * have typed by hand:
 *
 *     🔴 XAUUSD · SELL
 *
 *     Sell now 4259-4250
 *     4245
 *     4240
 *     4230
 *     Sl 4267
 *
 * Every destination is named, and the coach ticks the ones a given signal goes
 * to — a free room and a VIP room can share one bot without sharing a feed.
 *
 * Everything here is best-effort and never throws: the signal on the site is
 * the source of truth, and a Telegram outage must not fail (or delay) a coach's
 * post. Call it from `after()`.
 *
 * Configured entirely by environment variables — no rows, no migration. Each
 * list is comma-separated `Label = value` pairs (a bare value gets an
 * auto-label), so adding a group is an env change and a redeploy:
 *
 *   TELEGRAM_BOT_TOKEN   one bot, created with @BotFather
 *   TELEGRAM_CHATS       VIP Room = -1001234567890, Free Room = -1009876543210
 *                        Append ":<threadId>" to a chat id to post into one
 *                        topic of a forum group: "-1001234567890:42".
 *   DISCORD_WEBHOOKS     Signals = https://discord.com/api/webhooks/…
 *   IFTTT_WEBHOOKS       TG via IFTTT = https://maker.ifttt.com/trigger/…
 *                        Telegram without a bot of our own: IFTTT posts through
 *                        its @IFTTT bot, so this is the route when BotFather
 *                        won't issue a token. See docs/signal-relay.md.
 *
 * Labels are shown to coaches; chat ids and webhook URLs never leave the
 * server. Don't put a comma or an "=" in a label.
 *
 * Note: `formatSignalText` also runs in the browser, behind the composer's
 * "Copy for Telegram" button, so what a coach copies is byte-for-byte what the
 * relay sends. Keep this module free of server-only imports, and read env vars
 * inside functions rather than at module level, so nothing can be bundled into
 * the client.
 */

const TIMEOUT_MS = 10_000

/** The shape of a signal the relay knows how to render. */
export interface RelaySignal {
  symbol: string
  direction: string // 'buy' | 'sell'
  entryLow?: number | null
  entryHigh?: number | null
  slLow?: number | null
  slHigh?: number | null
  takeProfits?: { price: number }[]
  notes?: string | null
  chartUrl?: string | null
}

export const RELAY_CHANNELS = ['telegram', 'discord', 'ifttt'] as const
export type RelayChannel = (typeof RELAY_CHANNELS)[number]

/** A destination as the browser sees it — no chat id, no webhook URL. */
export interface RelayDestination {
  id: string
  channel: RelayChannel
  label: string
}

interface TelegramTarget extends RelayDestination { channel: 'telegram'; chatId: string; threadId?: number }
interface DiscordTarget extends RelayDestination { channel: 'discord'; webhook: string }
interface IftttTarget extends RelayDestination { channel: 'ifttt'; webhook: string }
type RelayTarget = TelegramTarget | DiscordTarget | IftttTarget

export interface RelayResult {
  sent: number
  failed: number
  byChannel: Record<RelayChannel, { sent: number; failed: number }>
  /** Labels that came back with an error, for the composer's test button. */
  failures: string[]
  /** Set when nothing was attempted, e.g. 'not configured' or 'no destinations selected'. */
  skipped?: string
}

const emptyResult = (): RelayResult => ({
  sent: 0,
  failed: 0,
  byChannel: { telegram: { sent: 0, failed: 0 }, discord: { sent: 0, failed: 0 }, ifttt: { sent: 0, failed: 0 } },
  failures: [],
})

/* ---------- configuration ---------- */

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'

/**
 * Parses one `Label = value, Label = value` list. A bare entry (no "=") keeps
 * its value as the label, so a quick single-group setup needs no naming.
 */
function parseNamed(raw: string | undefined): { label: string; value: string }[] {
  return (raw ?? '')
    .split(',')
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => {
      const at = chunk.indexOf('=')
      if (at === -1) return { label: chunk, value: chunk }
      return { label: chunk.slice(0, at).trim(), value: chunk.slice(at + 1).trim() }
    })
    .filter(e => e.label && e.value)
}

/**
 * Ids are derived from the label so a coach's saved pick survives a redeploy —
 * unlike a position in the list, which shifts the moment a group is added.
 * Duplicate labels get a numeric suffix rather than silently colliding.
 */
function withIds<T extends { label: string }>(prefix: string, entries: T[]): (T & { id: string })[] {
  const seen = new Map<string, number>()
  return entries.map(e => {
    const base = `${prefix}:${slug(e.label)}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return { ...e, id: n === 1 ? base : `${base}-${n}` }
  })
}

function telegramTargets(): TelegramTarget[] {
  if (!process.env.TELEGRAM_BOT_TOKEN) return []
  return withIds('tg', parseNamed(process.env.TELEGRAM_CHATS)).map(e => {
    // A chat id is "-100…"; the optional thread suffix is the last ":", so
    // split from the right to leave the leading minus alone.
    const at = e.value.lastIndexOf(':')
    const thread = at > 0 ? Number(e.value.slice(at + 1)) : NaN
    const hasThread = Number.isInteger(thread) && thread > 0
    return {
      id: e.id,
      channel: 'telegram' as const,
      label: e.label,
      chatId: hasThread ? e.value.slice(0, at) : e.value,
      ...(hasThread ? { threadId: thread } : {}),
    }
  })
}

function discordTargets(): DiscordTarget[] {
  return withIds('dc', parseNamed(process.env.DISCORD_WEBHOOKS))
    // Only ever POST to Discord's own webhook host — a stray value in the env
    // shouldn't turn this into an open relay to any URL.
    .filter(e => /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\//i.test(e.value))
    .map(e => ({ id: e.id, channel: 'discord' as const, label: e.label, webhook: e.value }))
}

/**
 * IFTTT "Receive a web request" webhooks. Each one drives an applet whose
 * action posts into a Telegram group through the @IFTTT bot — the way to reach
 * Telegram when BotFather won't issue us a token of our own.
 */
function iftttTargets(): IftttTarget[] {
  return withIds('if', parseNamed(process.env.IFTTT_WEBHOOKS))
    .filter(e => /^https:\/\/maker\.ifttt\.com\/trigger\//i.test(e.value))
    .map(e => ({ id: e.id, channel: 'ifttt' as const, label: e.label, webhook: e.value }))
}

function allTargets(): RelayTarget[] {
  return [...telegramTargets(), ...discordTargets(), ...iftttTargets()]
}

/** The pickable destinations, safe to send to the browser. */
export function relayDestinations(): RelayDestination[] {
  return allTargets().map(({ id, channel, label }) => ({ id, channel, label }))
}

/** What's wired up right now — a quick "is this on?" for ops. */
export function relayStatus() {
  const dests = relayDestinations()
  return {
    hasTelegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    counts: Object.fromEntries(
      RELAY_CHANNELS.map(c => [c, dests.filter(d => d.channel === c).length]),
    ) as Record<RelayChannel, number>,
    destinations: dests,
  }
}

/* ---------- formatting ---------- */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Trim float noise ("4259.5" stays, "4259.0" becomes "4259").
const price = (n: number) => String(Number(n.toFixed(5)))

/**
 * "Sell now 4259-4250" — entries listed in the order a coach scales in, so a
 * sell counts down from the highest price and a buy counts up from the lowest.
 */
function entryLine(s: RelaySignal): string | null {
  const verb = s.direction === 'sell' ? 'Sell' : 'Buy'
  const parts = [s.entryLow, s.entryHigh].filter((n): n is number => n != null && Number.isFinite(n))
  if (parts.length === 0) return null
  const uniq = [...new Set(parts)]
  const ordered = s.direction === 'sell' ? uniq.sort((a, b) => b - a) : uniq.sort((a, b) => a - b)
  return `${verb} now ${ordered.map(price).join('-')}`
}

function stopLine(s: RelaySignal): string | null {
  const parts = [s.slLow, s.slHigh].filter((n): n is number => n != null && Number.isFinite(n))
  if (parts.length === 0) return null
  const uniq = [...new Set(parts)].sort((a, b) => a - b)
  return `Sl ${uniq.map(price).join('-')}`
}

/**
 * The signal as plain text — the exact shorthand members are used to reading,
 * and the same body both Telegram and Discord receive.
 */
export function formatSignalText(s: RelaySignal, opts: { url?: string } = {}): string {
  const dir = s.direction === 'sell' ? 'SELL' : 'BUY'
  const dot = s.direction === 'sell' ? '🔴' : '🟢'
  const blocks: string[] = [`${dot} ${s.symbol.toUpperCase()} · ${dir}`]

  // Entry, then one target per line, exactly as a coach types it.
  const body = [entryLine(s), ...(s.takeProfits ?? []).map(t => price(t.price))].filter(Boolean)
  if (body.length) blocks.push(body.join('\n'))

  const sl = stopLine(s)
  if (sl) blocks.push(sl)

  const notes = s.notes?.trim()
  if (notes) blocks.push(notes)

  if (opts.url) blocks.push(`Full setup → ${opts.url}`)
  blocks.push('Not financial advice. Manage your risk.')

  return blocks.join('\n\n')
}

/** Green for a buy, red for a sell — Discord's embed accent. */
const embedColor = (direction: string) => (direction === 'sell' ? 0xef4444 : 0x22c55e)

/* ---------- delivery ---------- */

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${res.status} ${detail.slice(0, 200)}`)
  }
  return res
}

/**
 * One Telegram chat. A chart is sent as a photo with the signal as its caption
 * so the numbers and the picture arrive as a single message; captions cap at
 * 1024 characters, so an over-long one falls back to a plain text message.
 */
async function sendTelegram(t: TelegramTarget, text: string, chartUrl?: string | null) {
  const token = process.env.TELEGRAM_BOT_TOKEN!
  const base = {
    chat_id: t.chatId,
    ...(t.threadId ? { message_thread_id: t.threadId } : {}),
    parse_mode: 'HTML' as const,
  }
  const html = escapeHtml(text)

  if (chartUrl && html.length <= 1024) {
    await postJson(`https://api.telegram.org/bot${token}/sendPhoto`, { ...base, photo: chartUrl, caption: html })
    return
  }
  await postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
    ...base,
    text: html,
    link_preview_options: { is_disabled: true },
  })
}

async function sendDiscord(t: DiscordTarget, s: RelaySignal, text: string) {
  // Split the header off the body: Discord renders it as the embed title.
  const [title, ...rest] = text.split('\n\n')
  await postJson(t.webhook, {
    embeds: [
      {
        title,
        description: rest.join('\n\n'),
        color: embedColor(s.direction),
        ...(s.chartUrl ? { image: { url: s.chartUrl } } : {}),
        timestamp: new Date().toISOString(),
      },
    ],
  })
}

/**
 * One IFTTT applet. The webhook trigger carries three ingredients, which the
 * applet's Telegram action maps onto the message: Value1 is the signal itself,
 * Value2 the chart, Value3 the link back. IFTTT posts it through the @IFTTT
 * bot, so nothing here needs a bot token of ours.
 */
async function sendIfttt(t: IftttTarget, text: string, signal: RelaySignal, url?: string) {
  await postJson(t.webhook, {
    value1: text,
    value2: signal.chartUrl ?? '',
    value3: url ?? '',
  })
}

/**
 * Fan a signal out to the chosen destinations. Never throws — each room fails
 * on its own and is only ever logged, so one dead webhook can't stop the others
 * or the post that triggered it.
 *
 * @param opts.to  destination ids the coach ticked (from `relayDestinations()`).
 *                 Omit to send to every configured room.
 */
export async function relaySignal(
  signal: RelaySignal,
  opts: { url?: string; to?: string[] } = {},
): Promise<RelayResult> {
  const out = emptyResult()

  const configured = allTargets()
  if (configured.length === 0) return { ...out, skipped: 'not configured' }

  // An unknown id (a group removed from the env since the editor loaded) is
  // dropped rather than guessed at — better a missed room than a wrong one.
  const picked = opts.to ? configured.filter(t => opts.to!.includes(t.id)) : configured
  if (picked.length === 0) return { ...out, skipped: 'no destinations selected' }

  const text = formatSignalText(signal, { url: opts.url })

  await Promise.all(
    picked.map(async t => {
      try {
        if (t.channel === 'telegram') await sendTelegram(t, text, signal.chartUrl)
        else if (t.channel === 'discord') await sendDiscord(t, signal, text)
        else await sendIfttt(t, text, signal, opts.url)
        out.byChannel[t.channel].sent++
        out.sent++
      } catch (e) {
        out.byChannel[t.channel].failed++
        out.failed++
        out.failures.push(t.label)
        // Log the label, never the chat id or the webhook's token.
        console.error(`[SIGNAL_RELAY] ${t.channel} "${t.label}":`, (e as Error).message)
      }
    }),
  )

  console.log(`[SIGNAL_RELAY] ${signal.symbol} ${signal.direction} — ${out.sent}/${picked.length} rooms`)
  return out
}

/** The signal the admin screen's "Send a test" button posts. */
export const SAMPLE_SIGNAL: RelaySignal = {
  symbol: 'XAUUSD',
  direction: 'sell',
  entryLow: 4250,
  entryHigh: 4259,
  slLow: 4267,
  slHigh: null,
  takeProfits: [4245, 4240, 4230, 4225, 4220, 4200].map(p => ({ price: p })),
  notes: 'Test message from the GHT Trading community app — not a live signal.',
}
