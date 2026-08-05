# Signal relay — posting signals to Telegram & Discord

When a coach posts a new signal on `/ideas`, the **Also post to** box in the
composer lists every connected Telegram group and Discord channel. Ticking a
room mirrors the signal there, in the shorthand members already read:

```
🔴 XAUUSD · SELL

Sell now 4259-4250
4245
4240
4230
4225
4220
4200

Sl 4267

Full setup → https://community.ghttrading.co/ideas

Not financial advice. Manage your risk.
```

Nothing is ticked by default, so a signal only leaves the site when a coach
says so. Editing a signal never re-broadcasts — the rooms already have it.

Rooms come from environment variables, so adding one is an env change plus a
redeploy. No database rows, no migration.

---

## 1. Telegram

You need **one bot**, added to **every group** you want to post into.

> **Can't create a bot?** If BotFather refuses `/newbot` ("you cannot create new
> bots at this time"), your Telegram account is under an anti-spam restriction —
> appeal via [@SpamBot](https://t.me/SpamBot). Meanwhile, jump to
> [Telegram without a bot](#telegram-without-a-bot-ifttt) — IFTTT posts through
> its own bot, in real time, and needs no token from BotFather.

### Create the bot

1. In Telegram, message [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Give it a name and a username ending in `bot` (e.g. `GHTSignalsBot`).
3. BotFather replies with a token like `8123456789:AAH...`. That's
   `TELEGRAM_BOT_TOKEN`.

### Add it to each group

1. Open the group → **Add members** → search your bot's username → add it.
2. Make it an **admin** with *Post messages* (required in channels; in normal
   groups admin also stops Telegram's privacy mode from getting in the way).

### Find each group's chat id

Post any message in each group, then run:

```bash
npx tsx scripts/telegram-chats.ts <bot-token>
```

It checks the token, lists every group, channel and forum topic the bot can
see, and prints the finished `TELEGRAM_CHATS` line ready to paste. Telegram
only reports chats with recent traffic, so post first and run it within a few
minutes.

<details>
<summary>By hand, if you'd rather</summary>

Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser, find your
group in the JSON and copy `chat.id`. Groups and supergroups are **negative**,
e.g. `-1001234567890` — keep the minus sign.
</details>

For a **channel** rather than a group: add the bot as an admin, forward a
channel post into any chat with the bot, then re-run the script.

**Forum groups (topics):** to post into one topic instead of General, append
the topic id to the chat id — `-1001234567890:42`. The script prints the topic
ids it has seen; you can also read one from a topic's message link
(`t.me/c/1234567890/42/…` → `42`).

### Set the env vars

```bash
TELEGRAM_BOT_TOKEN="8123456789:AAH..."
# Comma-separated  Label = chat id.  The label is what coaches see.
TELEGRAM_CHATS="VIP Signals = -1001234567890, Free Room = -1009876543210, Gold Topic = -1001234567890:42"
```

---

## 2. Discord

Discord needs no bot — a **channel webhook** per channel is enough.

1. In Discord, **Server Settings → Integrations → Webhooks → New Webhook**
   (you need Manage Webhooks on the server).
2. Pick the channel, name it (e.g. `GHT Signals`), **Copy Webhook URL**.
3. Repeat for every channel you want signals in.

```bash
# Comma-separated  Label = webhook URL.
DISCORD_WEBHOOKS="Signals = https://discord.com/api/webhooks/123.../abc..., VIP = https://discord.com/api/webhooks/456.../def..."
```

Treat a webhook URL like a password — anyone holding it can post to that
channel. Only URLs on `discord.com/api/webhooks/` are accepted; anything else
in the list is ignored.

---

## 3. Wire it up

Add the variables to `.env.local` for local work, and to **Vercel → Project →
Settings → Environment Variables** for production, then redeploy (env changes
only take effect on a new deployment).

Labels are free text and show up verbatim in the composer. Don't use a comma or
an `=` inside a label — those are the separators.

Also set `NEXT_PUBLIC_APP_URL` (e.g. `https://community.ghttrading.co`) if it
isn't already: it's the "Full setup →" link at the bottom of each relayed
message.

## 4. Test it

Open **New Signal** on `/ideas`, tick the rooms, and hit **Send a sample**. It
posts the example signal above, labelled as a test, to exactly the rooms you
ticked — so you can confirm a group before a live setup depends on it.

---

## Notes

- **Charts.** A signal with a chart screenshot goes out as a photo with the
  signal as its caption. Telegram caps captions at 1024 characters, so a very
  long signal falls back to a plain text message.
- **Failures are isolated.** Each room is delivered independently, after the
  response. A revoked webhook or a bot kicked from a group is logged
  (`[SIGNAL_RELAY]`) and never blocks the post or the other rooms.
- **Private signals can still broadcast.** The room picker is independent of
  the Public/Private toggle, so a coach can push a setup to Telegram without
  putting it on the community board.
- **Secrets stay server-side.** The browser only ever receives a room's id and
  label; chat ids and webhook URLs never leave the server, and the room list is
  staff-only (`GET /api/staff/relay`).

---

## Telegram without a bot (IFTTT)

**This is the route to use if BotFather won't give you a token.** IFTTT sends
Telegram messages through its own **@IFTTT** bot, and its Webhooks trigger fires
the moment we call it — so delivery is push, not polling, and fast enough for a
live entry zone. It shows up in the composer's room picker like any other room.

The tradeoff is a third party in the delivery path: if IFTTT is down or
throttling, that room is delayed. Direct Telegram is still better once you have
a token, so treat this as the bridge until the appeal clears.

### Set up the applet

1. Create an account at [ifttt.com](https://ifttt.com). The free plan covers
   the Telegram send actions; Pro raises the automation limit if you want a
   separate applet per group.
2. Add **@IFTTT** to your Telegram group and make it an **admin** (required for
   channels, and the reliable setup for groups).
3. New applet → **If This** → **Webhooks** → *Receive a web request*. Give the
   event a name, e.g. `new_signal`.
4. **Then That** → **Telegram** → *Send message*. Pick your group, and set the
   message body to the single ingredient **`{{Value1}}`** — that's the whole
   pre-formatted signal. Delete anything else IFTTT pre-fills, or the message
   will be duplicated.
   - For the chart too, use *Send photo* with `{{Value2}}` as the image URL and
     `{{Value1}}` as the caption. Signals without a chart send an empty
     `Value2`, so keep a *Send message* applet as well if you post both kinds.
5. Grab your webhook URL from
   [ifttt.com/maker_webhooks](https://ifttt.com/maker_webhooks) →
   **Documentation**. It looks like
   `https://maker.ifttt.com/trigger/new_signal/with/key/<your-key>`.

### Set the env var

```bash
# Comma-separated  Label = webhook URL. The label is what coaches see.
IFTTT_WEBHOOKS="VIP Telegram = https://maker.ifttt.com/trigger/new_signal/with/key/abc123"
```

One applet per group: make a second event name (`new_signal_free`), point a
second applet at the other group, and add it to the list.

The key in that URL is a credential — treat it like the Discord webhooks. Only
URLs on `maker.ifttt.com/trigger/` are accepted.

### What we send

Each call carries three ingredients:

| Ingredient | Contents |
|---|---|
| `Value1` | The full formatted signal — the same text Telegram and Discord get |
| `Value2` | Chart image URL, or empty |
| `Value3` | Link back to the signal on the site |

Test it from the composer with **Send a sample**, same as any other room.

---

## Telegram without a bot (RSS bridge)

If BotFather won't let you create a bot, you can still get signals into a
Telegram group: a **public feed bot** reads an RSS feed of your signals and
posts each new one. No bot token, nothing to create.

`GET /api/signals/rss?k=<token>` serves the last 20 **public** signals, each
carrying the same text the direct relay sends.

### Turn it on

```bash
# Any long random string. Rotating it kills every old feed URL.
SIGNAL_FEED_TOKEN="$(openssl rand -hex 32)"
```

The feed is **off** unless this is set — no token, no endpoint (it 404s either
way, so the URL can't be used to probe for it).

### Point a feed bot at it

1. In Telegram, add [@TheFeedReaderBot](https://t.me/TheFeedReaderBot) to your
   group and make it an **admin**.
2. Your own admin rights in that group must have **Remain Anonymous off**, or
   the bot can't be configured against it.
3. Message the bot → *configure a new group* → pick your group.
4. Give it the feed URL:
   `https://community.ghttrading.co/api/signals/rss?k=<your token>`

Any RSS bot works the same way — [RSS.app](https://rss.app/bots/rssfeeds-telegram-bot)'s
is another, and self-hosting [RSS-to-Telegram-Bot](https://github.com/Rongronggg9/RSS-to-Telegram-Bot)
is an option if you want control over polling and layout.

### What you give up

Worth being clear-eyed about, because this is a weaker setup than the direct
relay in three ways:

- **It's delayed.** Feed bots poll, typically every few minutes to half an
  hour. Fine for swing setups; too slow for a scalp with a tight entry zone.
- **You don't control the layout.** The bot decides how the item renders. The
  title carries pair, direction and entry so it reads correctly even when a bot
  shows nothing else.
- **It's a secret URL, not a login.** Anyone holding the link reads your public
  signals, and the token sits in the URL rather than a header, because that's
  all a feed bot can send. Treat it like a password: don't paste it into a
  group chat, and rotate `SIGNAL_FEED_TOKEN` if it ever leaks. Private signals
  are never in the feed, and the response is `no-store` + `noindex`.

The room picker in the composer is unaffected — it keeps listing whatever
Telegram/Discord rooms you have wired directly. The bridge runs alongside it,
so once you do get a bot token, add it and the feed becomes redundant.
