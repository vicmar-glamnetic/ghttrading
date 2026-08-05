// Finds the chat ids for TELEGRAM_CHATS — the one genuinely fiddly step in
// setting up the signal relay (see docs/signal-relay.md).
//
// It verifies your bot token, then reads the bot's pending updates and prints
// every group, channel and forum topic it has seen a message in, already
// formatted as the env line you paste into Vercel.
//
// Usage:
//   npx tsx scripts/telegram-chats.ts <bot-token>
//   npx tsx scripts/telegram-chats.ts            # uses TELEGRAM_BOT_TOKEN
//
// Before running: add the bot to each group (as an admin) and post any message
// in every one of them — Telegram only reports chats it has recent traffic for.
import 'dotenv/config'

const token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('No bot token. Pass it as an argument, or set TELEGRAM_BOT_TOKEN in .env.local:')
  console.error('  npx tsx scripts/telegram-chats.ts 8123456789:AAH...')
  process.exit(1)
}

const api = (method: string) => `https://api.telegram.org/bot${token}/${method}`

interface Chat { id: number; type: string; title?: string; username?: string; is_forum?: boolean }
interface Message { chat?: Chat; message_thread_id?: number; forward_from_chat?: Chat }
interface Update { message?: Message; channel_post?: Message; edited_message?: Message }

async function call<T>(method: string): Promise<T> {
  const res = await fetch(api(method))
  const body = await res.json()
  if (!body.ok) throw new Error(`${method}: ${body.description ?? res.status}`)
  return body.result as T
}

// "VIP Signals" -> a label safe to drop into the comma/equals-separated env list.
const cleanLabel = (s: string) => s.replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()

async function main() {
  const me = await call<{ username: string; first_name: string }>('getMe')
  console.log(`✓ Token is valid — bot @${me.username} (${me.first_name})\n`)

  const updates = await call<Update[]>('getUpdates')

  // One entry per chat, remembering any forum topics the bot has seen so a
  // topic-specific room can be set up without hunting through message links.
  const chats = new Map<number, Chat & { topics: Set<number> }>()
  for (const u of updates) {
    const msg = u.message ?? u.channel_post ?? u.edited_message
    for (const c of [msg?.chat, msg?.forward_from_chat]) {
      if (!c || c.type === 'private') continue // DMs aren't signal rooms
      const entry = chats.get(c.id) ?? { ...c, topics: new Set<number>() }
      if (c.id === msg?.chat?.id && msg.message_thread_id) entry.topics.add(msg.message_thread_id)
      chats.set(c.id, entry)
    }
  }

  if (chats.size === 0) {
    console.log('No groups or channels found yet.\n')
    console.log('Telegram only reports chats with recent traffic, so:')
    console.log('  1. Add the bot to the group and make it an admin.')
    console.log('  2. Post any message in that group.')
    console.log('  3. Run this again within a few minutes.\n')
    console.log('For a channel: add the bot as an admin, then forward one channel')
    console.log('post into a direct chat with the bot and re-run.')
    return
  }

  console.log(`Found ${chats.size} chat${chats.size === 1 ? '' : 's'}:\n`)
  const pairs: string[] = []
  for (const c of chats.values()) {
    const label = cleanLabel(c.title ?? c.username ?? `Chat ${c.id}`)
    console.log(`  ${label}`)
    console.log(`    type: ${c.type}${c.is_forum ? ' (forum — has topics)' : ''}`)
    console.log(`    chat id: ${c.id}`)
    if (c.topics.size) console.log(`    topics seen: ${[...c.topics].join(', ')}  → use "${c.id}:<topic>" to post into one`)
    console.log()
    pairs.push(`${label} = ${c.id}`)
  }

  console.log('Paste this into .env.local (and Vercel → Settings → Environment Variables):\n')
  console.log(`TELEGRAM_BOT_TOKEN="${token}"`)
  console.log(`TELEGRAM_CHATS="${pairs.join(', ')}"`)
  console.log('\nRename the labels to whatever you want coaches to see in the composer.')
}

main().catch(e => {
  console.error(`\n✗ ${(e as Error).message}`)
  console.error('\nIf that says "Unauthorized", the token is wrong — get a fresh one from @BotFather with /mybots.')
  process.exit(1)
})
