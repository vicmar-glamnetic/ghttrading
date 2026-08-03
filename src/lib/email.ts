import { Resend } from 'resend'
import { applyTokens, escapeHtml, isSafeUrl, renderBody, type RecipientVars } from '@/lib/broadcast'

// Lazily construct the client so a missing key doesn't crash the build /
// page-data collection — it only errors if we actually try to send an email.
let _resend: Resend | null = null
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set — cannot send email')
  if (!_resend) _resend = new Resend(key)
  return _resend
}
const FROM = process.env.RESEND_FROM_EMAIL || 'Gold Heist Trading <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://community.ghttrading.co'

export async function sendVerificationEmail(email: string, code: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your Gold Heist Trading verification code: ${code}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">GHT <span style="color:#ad9045;">Community</span></h1>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">Verify your email</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">Enter this code to finish creating your account:</p>
          <div style="display:inline-block;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:900;letter-spacing:8px;color:#ad9045;">${code}</div>
          <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">This code expires in <strong style="color:#9090a8;">15 minutes</strong>. If you didn't sign up, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
  })
}

/**
 * Sign-up approved.
 *
 * Approval and ACCM verification are two separate gates, and staff often clear
 * the first while the second is still open — an approved member who never
 * uploaded their account screenshot walks straight into the blocking pop-up.
 * Telling them "you now have full access" in that case is simply wrong, so pass
 * `needsProof` (i.e. needsVerification(user)) and they get the one-step-left
 * version instead.
 */
export function buildApprovalEmail(name?: string | null, needsProof = false): { subject: string; html: string } {
  const loginUrl = `${APP_URL}/login`
  const greeting = name ? `Welcome, ${name}!` : 'Welcome!'

  const body = needsProof
    ? `
            <p style="margin:0 0 16px;font-size:14px;color:#9090a8;line-height:1.6;">
              Good news — your sign-up has been <strong style="color:#ad9045;">approved</strong> by our team.
              There&rsquo;s <strong style="color:#f0f0f8;">one step left</strong> before you can use the app.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;margin:0 0 20px;">
              <tr><td style="padding:18px 20px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#ad9045;">Upload a screenshot of your ACCM account</p>
                <p style="margin:0;font-size:13px;color:#9090a8;line-height:1.6;">
                  Every member verifies their AC Capital Market account before joining the community —
                  it&rsquo;s how we keep the signals and the live room to real, funded traders.
                  Log in and the upload box appears straight away.
                </p>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#9090a8;line-height:1.6;">
              As soon as it&rsquo;s uploaded you&rsquo;re in. If a coach needs to check it first, we&rsquo;ll email you
              the moment they do — you don&rsquo;t have to sit and wait on the screen.
            </p>`
    : `
            <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
              Great news — your account has been <strong style="color:#ad9045;">approved</strong> by our team.
              You now have full access to the Gold Heist Trading community, live gold signals, and premium insights.
            </p>`

  const subject = needsProof
    ? 'You’re approved — one step left to unlock your account'
    : 'Your Gold Heist Trading account has been approved 🎉'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
              GHT <span style="color:#ad9045;">Community</span>
            </h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9090a8;">Premium Trading Insights & Gold Signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">${greeting}</h2>${body}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    ${needsProof ? 'Log in &amp; upload your screenshot' : 'Log in to your account'}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">
              ${needsProof
                ? 'Don’t have a screenshot handy? Reply to this email and a coach will sort it out with you.'
                : 'If you were already signed in, just log out and back in to refresh your access.'}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim()

  return { subject, html }
}

export async function sendApprovalEmail(email: string, name?: string | null, needsProof = false) {
  const { subject, html } = buildApprovalEmail(name, needsProof)
  await getResend().emails.send({ from: FROM, to: email, subject, html })
}

/**
 * Win-back email for expired non-ACCM (other-broker) members — a one-off blast
 * the admin fires from the dashboard. Focuses on the single $5/mo offer.
 */
export function buildWinBackEmail(name?: string | null): { subject: string; html: string } {
  const upgradeUrl = `${APP_URL}/upgrade`
  const greeting = name ? `Hey ${name},` : 'Hey trader,'
  const perks = [
    ['🎯', 'Live gold (XAU/USD) signals', 'Entry, stop-loss and take-profit levels the moment we take them.'],
    ['📡', 'Live trading room', 'Watch our traders work the market in real time, every session.'],
    ['🎓', 'Full course library', 'Structured lessons that take you from the basics to consistent execution.'],
    ['🧠', 'Coach trade ideas & analysis', 'Daily bias, key levels and setups broken down for you.'],
    ['🛠️', 'Pro tools', 'Position-size calculator, trading journal and an economic calendar.'],
    ['🛡️', 'Risk & anti-hacking playbook', 'Protect your capital and your accounts the right way.'],
    ['💬', 'The community', 'Feed, groups, price alerts and direct chat with traders like you.'],
  ]

  const perksHtml = perks.map(([icon, title, desc]) => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;width:34px;font-size:18px;">${icon}</td>
      <td style="padding:10px 0;vertical-align:top;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#f0f0f8;">${title}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#9090a8;line-height:1.5;">${desc}</p>
      </td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
              GHT <span style="color:#ad9045;">Community</span>
            </h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9090a8;">Premium Trading Insights &amp; Gold Signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:21px;font-weight:800;color:#f0f0f8;">${greeting} your access has expired</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#9090a8;line-height:1.6;">
              Your membership has lapsed, so you're missing today's gold signals and the live room.
              Come back for just <strong style="color:#ad9045;">$5/month</strong> and pick up right where you left off — here's everything that's waiting for you:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              ${perksHtml}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td align="center" style="background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;padding:20px;">
                  <p style="margin:0;font-size:13px;color:#9090a8;text-transform:uppercase;letter-spacing:1px;">Everything above for</p>
                  <p style="margin:6px 0 0;font-size:40px;font-weight:900;color:#ad9045;">$5<span style="font-size:16px;color:#9090a8;font-weight:600;">/month</span></p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${upgradeUrl}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:800;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:10px;">
                    Reactivate for $5/mo →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">
              Prefer it free? Trade with our ACCM partner and your membership is on the house.
              Just reply to this email and we'll show you how.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  return { subject: "You're missing today's gold signals — come back for $5/mo", html }
}

/**
 * Sends the win-back email to a batch of recipients via Resend's batch API
 * (max 100 per call). Returns how many were accepted vs failed.
 */
export async function sendWinBackEmails(
  recipients: { email: string; name?: string | null }[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildWinBackEmail(r.name)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length
      else sent += chunk.length
    } catch {
      failed += chunk.length
    }
  }

  return { sent, failed }
}

/** Small shared shell so the newer transactional emails share the brand chrome. */
function emailShell(inner: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">GHT <span style="color:#ad9045;">Community</span></h1>
        </td></tr>
        <tr><td style="padding:32px;">${inner}</td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim()
}

function ctaButton(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${href}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">${label}</a>
  </td></tr></table>`
}

/**
 * Weekly nudge for members who haven't journaled in the last 7 days. Re-engages
 * lapsed journalers — the traders most likely to come back. Sent via the batch
 * API so each recipient can be greeted by name (see sendJournalNudgeEmails).
 */
function buildJournalNudgeEmail(name?: string | null): { subject: string; html: string } {
  const url = `${APP_URL}/journal?compose=prompt`
  const greeting = name ? `Hey ${name},` : 'Hey trader,'
  const inner = `
    <h2 style="margin:0 0 12px;font-size:21px;font-weight:800;color:#f0f0f8;">${greeting} how did your week trade?</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#9090a8;line-height:1.6;">
      You haven't logged a trade this week. Traders who journal spot their own patterns faster —
      which setups pay, which days bleed, and where discipline slips. It takes 60 seconds.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#ad9045;font-weight:700;">This week's prompt: did you follow your plan?</p>
    ${ctaButton(url, 'Write this week’s entry →')}
    <p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">
      Manage email preferences anytime in Settings.
    </p>`
  return { subject: 'Your trades this week are worth 60 seconds 📓', html: emailShell(inner) }
}

export async function sendJournalNudgeEmails(
  recipients: { email: string; name?: string | null }[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildJournalNudgeEmail(r.name)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length; else sent += chunk.length
    } catch { failed += chunk.length }
  }
  return { sent, failed }
}

export interface MonthlyRecapStats {
  name?: string | null
  monthLabel: string
  entries: number
  wins: number
  losses: number
  winRate: number
  net: number | null       // net P&L across entries that carried one; null if none did
  bestSetup?: string | null
}

/** Personalised month-in-review for members who journaled last month (#8). */
function buildMonthlyRecapEmail(s: MonthlyRecapStats): { subject: string; html: string } {
  const url = `${APP_URL}/journal`
  const greeting = s.name ? `Hey ${s.name},` : 'Hey trader,'
  const money = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  const stat = (label: string, value: string, color = '#f0f0f8') =>
    `<td align="center" style="padding:14px 8px;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;">
       <p style="margin:0;font-size:22px;font-weight:900;color:${color};">${value}</p>
       <p style="margin:4px 0 0;font-size:11px;color:#9090a8;text-transform:uppercase;letter-spacing:1px;">${label}</p>
     </td>`
  const netCell = s.net == null ? '' : `<tr><td height="10"></td></tr><tr>${stat('Net P&L', money(s.net), s.net >= 0 ? '#4ade80' : '#f87171')}</tr>`
  const inner = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;color:#f0f0f8;">${greeting}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#9090a8;line-height:1.6;">Here's your ${s.monthLabel} in numbers 📊</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        ${stat('Entries', String(s.entries))}
        <td width="10"></td>
        ${stat('Win rate', `${s.winRate}%`)}
        <td width="10"></td>
        ${stat('W / L', `${s.wins}/${s.losses}`)}
      </tr>
      ${netCell}
    </table>
    ${s.bestSetup ? `<p style="margin:16px 0 0;font-size:14px;color:#9090a8;">Most-tagged setup: <strong style="color:#ad9045;">${s.bestSetup}</strong></p>` : ''}
    <p style="margin:20px 0 24px;font-size:13px;color:#9090a8;line-height:1.6;">Keep the streak going — the more you log, the sharper this report gets.</p>
    ${ctaButton(url, 'Open your journal →')}`
  return { subject: `Your ${s.monthLabel} trading recap 📊`, html: emailShell(inner) }
}

export async function sendMonthlyRecapEmails(
  recipients: (MonthlyRecapStats & { email: string })[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildMonthlyRecapEmail(r)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length; else sent += chunk.length
    } catch { failed += chunk.length }
  }
  return { sent, failed }
}

/** The part of a new signal an email is allowed to carry. */
export interface SignalTeaser {
  symbol: string
  direction: string        // buy | sell
  entry?: string | null    // pre-formatted entry price or range, e.g. "3320–3324"
  targetCount?: number     // how many take-profits are set — the number, never the prices
  hasStop?: boolean
}

/**
 * New-signal alert. Deliberately a teaser: the pair, the direction and the entry
 * zone are enough for a member to know whether to drop what they're doing, but
 * the stop, the targets, the chart and the coach's notes stay behind the login.
 * Emails get forwarded and screenshotted — the full setup is what members are
 * here for, so it never leaves the app.
 */
function buildSignalAlertEmail(signal: SignalTeaser, name?: string | null): { subject: string; html: string } {
  const url = `${APP_URL}/ideas`
  const greeting = name ? `Hey ${name},` : 'Hey trader,'
  const isBuy = signal.direction.toLowerCase() !== 'sell'
  const dir = isBuy ? 'BUY' : 'SELL'
  const accent = isBuy ? '#4ade80' : '#f87171'
  const symbol = escapeHtml(signal.symbol)

  // Only the levels that are safe to show. Everything else is described by
  // count, so the member can see there IS a full plan without reading it here.
  const rows: [string, string][] = [['Pair', symbol], ['Direction', dir]]
  if (signal.entry) rows.push(['Entry zone', escapeHtml(signal.entry)])

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#9090a8;">${label}</td>
      <td style="padding:8px 0;font-size:15px;font-weight:800;color:#f0f0f8;text-align:right;">${value}</td>
    </tr>`).join('')

  const locked = [
    signal.hasStop ? 'stop loss' : null,
    signal.targetCount ? `${signal.targetCount} take-profit target${signal.targetCount === 1 ? '' : 's'}` : null,
    'the chart and the coach’s notes',
  ].filter(Boolean) as string[]
  const lockedText =
    locked.length > 1 ? `${locked.slice(0, -1).join(', ')} and ${locked[locked.length - 1]}` : locked[0]

  const inner = `
    <div style="text-align:center;margin:0 0 18px;">
      <span style="display:inline-block;background:${accent}20;border:1px solid ${accent}50;border-radius:999px;padding:6px 16px;font-size:12px;font-weight:800;color:${accent};letter-spacing:1px;text-transform:uppercase;">&#128200; New ${dir} signal</span>
    </div>
    <h2 style="margin:0 0 12px;font-size:21px;font-weight:800;color:#f0f0f8;text-align:center;">${greeting} a new signal just dropped</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#9090a8;line-height:1.6;text-align:center;">
      One of our coaches has published a new ${dir} setup on <strong style="color:#f0f0f8;">${symbol}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;padding:6px 18px;margin:0 0 20px;">
      ${rowsHtml}
    </table>

    <p style="margin:0 0 22px;font-size:13px;color:#9090a8;line-height:1.6;text-align:center;">
      The ${lockedText} are in the app — log in to see the full setup before price moves.
    </p>
    ${ctaButton(url, 'Log in to view the full setup →')}
    <p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">
      Trading involves risk. Always size your position to your own plan — never copy a signal blind.
    </p>`

  return { subject: `📈 New ${dir} signal · ${signal.symbol}`, html: emailShell(inner) }
}

/**
 * Mails the teaser to everyone on the list via Resend's batch API (100 per
 * call), greeting each by name. Never throws — a mail outage must not take the
 * signal down with it, so the caller gets counts and moves on.
 */
export async function sendSignalAlertEmails(
  recipients: { email: string; name?: string | null }[],
  signal: SignalTeaser,
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildSignalAlertEmail(signal, r.name)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length; else sent += chunk.length
    } catch { failed += chunk.length }
  }
  return { sent, failed }
}

/**
 * "We're live" blast — staff fire this by hand from the live page once a session
 * is actually up. Going live already pushes a notification; this reaches the
 * members who never enabled push, and it stays manual so re-uploading a stream
 * (toggling live off and on again) doesn't email everyone twice.
 */
function buildLiveAnnounceEmail(name?: string | null, title?: string | null): { subject: string; html: string } {
  const url = `${APP_URL}/live`
  const greeting = name ? `Hey ${name},` : 'Hey trader,'
  const inner = `
    <div style="text-align:center;margin:0 0 18px;">
      <span style="display:inline-block;background:#f8717120;border:1px solid #f8717150;border-radius:999px;padding:6px 16px;font-size:12px;font-weight:800;color:#f87171;letter-spacing:1px;text-transform:uppercase;">&#128308; Live now</span>
    </div>
    <h2 style="margin:0 0 12px;font-size:21px;font-weight:800;color:#f0f0f8;text-align:center;">${greeting} we're live</h2>
    ${title ? `<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#ad9045;text-align:center;">${title}</p>` : ''}
    <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;text-align:center;">
      The session has started in the GHT live room — live gold analysis, the levels we're watching,
      and trades called as they happen. Jump in now and bring your questions.
    </p>
    ${ctaButton(url, 'Watch live now →')}
    <p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">
      Can't make it? The replay lands in the community afterwards.
    </p>`
  return {
    subject: title ? `🔴 We're live: ${title}` : "🔴 We're live now — join the session",
    html: emailShell(inner),
  }
}

export async function sendLiveAnnounceEmails(
  recipients: { email: string; name?: string | null }[],
  title?: string | null,
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildLiveAnnounceEmail(r.name, title)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length; else sent += chunk.length
    } catch { failed += chunk.length }
  }
  return { sent, failed }
}

/**
 * Sent after an admin clears out the never-verified ACCM accounts. These
 * members never got past the proof-of-account step, so e-mail is the only way
 * to tell them — and the message has to double as an invitation back, since
 * registering again is exactly what we want them to do.
 */
function buildAccountDeletedEmail(name?: string | null): { subject: string; html: string } {
  const registerUrl = `${APP_URL}/register`
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const inner = `
    <h2 style="margin:0 0 12px;font-size:21px;font-weight:800;color:#f0f0f8;">${greeting} your account has been removed</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#9090a8;line-height:1.6;">
      Your Gold Heist Trading account was never verified, so we&rsquo;ve removed it in a clean-up of
      unverified sign-ups. Nothing is wrong on your side &mdash; the ACCM account check was simply
      never completed.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
      You&rsquo;re very welcome back. Just <strong style="color:#ad9045;">register again</strong> and finish
      verification by uploading a screenshot of your ACCM account &mdash; once a coach approves it, you get
      full access to the signals, the live room and the course library.
    </p>
    ${ctaButton(registerUrl, 'Register again →')}
    <p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">
      Stuck on the verification step? Reply to this email and we&rsquo;ll help you through it.
    </p>`
  return { subject: 'Your Gold Heist Trading account has been removed', html: emailShell(inner) }
}

/** Batch-sends the account-removed notice. Same 100-per-call chunking as the rest. */
export async function sendAccountDeletedEmails(
  recipients: { email: string; name?: string | null }[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildAccountDeletedEmail(r.name)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failed += chunk.length; else sent += chunk.length
    } catch { failed += chunk.length }
  }
  return { sent, failed }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Gold Heist Trading password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
              GHT <span style="color:#ad9045;">Community</span>
            </h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9090a8;">Premium Trading Insights & Gold Signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">Reset your password</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
              We received a request to reset the password for your Gold Heist Trading account. Click the button below to choose a new password.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">
              This link expires in <strong style="color:#9090a8;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#3a3a4a;word-break:break-all;">
              Or copy this link: ${resetUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  })
}

/**
 * Code that re-confirms a sensitive identity change (display name, real name or
 * ACCM number). Deliberately worded so a member who did NOT request it knows
 * their account is being tampered with and what to do about it.
 */
export async function sendIdentityCodeEmail(email: string, code: string, name?: string | null) {
  const hello = name ? `Hi ${name},` : 'Hi,'

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your Gold Heist Trading security code: ${code}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">GHT <span style="color:#ad9045;">Community</span></h1>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">Confirm your account details</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">${hello} enter this code to save your name and ACCM number:</p>
          <div style="display:inline-block;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:900;letter-spacing:8px;color:#ad9045;">${code}</div>
          <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">This code expires in <strong style="color:#9090a8;">10 minutes</strong>.</p>
          <p style="margin:16px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">If you didn&rsquo;t request this, someone else may have access to your account &mdash; <strong style="color:#ff6b6b;">change your password immediately</strong> and contact an admin.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3a3a4a;">&copy; 2026 Gold Heist Trading &middot; All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
  })
}

/**
 * Sent the moment a coach verifies a member's ACCM account.
 *
 * This one matters more than a normal notification: an unverified member is
 * locked out of the app, so they have no reason to open it and no way to see an
 * in-app notification. E-mail is the only channel that reaches them to say the
 * block is lifted.
 */
export async function sendVerifiedEmail(email: string, name?: string | null) {
  const loginUrl = `${APP_URL}/login`
  const greeting = name ? `You're verified, ${name}!` : "You're verified!"

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Your ACCM account is verified ✅',
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">GHT <span style="color:#ad9045;">Community</span></h1>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <div style="font-size:44px;line-height:1;margin-bottom:12px;">&#9989;</div>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">${greeting}</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
            We&rsquo;ve checked your ACCM account and you&rsquo;re all set. Your profile now carries a
            <strong style="color:#4ade80;">Verified</strong> badge, and you have full access to the community again.
          </p>
          <a href="${loginUrl}" style="display:inline-block;background:#ad9045;color:#0a0a0f;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">Open the community</a>
          <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">
            Tip: turn on Face ID in <strong style="color:#9090a8;">Settings &rsaquo; Security</strong> and you can sign in
            without typing your password again.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3a3a4a;">&copy; 2026 Gold Heist Trading &middot; All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
  })
}

/**
 * A one-off message written in the admin composer, rather than one of the fixed
 * templates above. The subject and body are whatever staff typed; the chrome,
 * the optional CTA button and the escaping are ours.
 */
export interface BroadcastTemplate {
  subject: string
  body: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  /** Small print under the message. Defaults to the standard "why am I getting this" line. */
  footnote?: string | null
}

const BROADCAST_FOOTNOTE = 'You’re receiving this because you have a Gold Heist Trading account.'

/**
 * Renders one recipient's copy of a composed message. Exported so the send
 * route and the composer's preview agree down to the markup.
 */
export function buildBroadcastEmail(
  tpl: BroadcastTemplate,
  vars: RecipientVars,
): { subject: string; html: string } {
  const subject = applyTokens(tpl.subject, vars).trim()
  const cta =
    tpl.ctaLabel?.trim() && tpl.ctaUrl?.trim() && isSafeUrl(tpl.ctaUrl)
      ? ctaButton(applyTokens(tpl.ctaUrl.trim(), vars), escapeHtml(applyTokens(tpl.ctaLabel.trim(), vars)))
      : ''
  const note = (tpl.footnote ?? BROADCAST_FOOTNOTE).trim()
  const inner = `
    ${renderBody(applyTokens(tpl.body, vars))}
    ${cta}
    ${note ? `<p style="margin:22px 0 0;font-size:12px;color:#5a5a72;line-height:1.6;text-align:center;">${escapeHtml(note)}</p>` : ''}`
  return { subject, html: emailShell(inner) }
}

/**
 * Sends a composed message to a hand-picked list. Same 100-per-call batching as
 * the other blasts, but it also reports which addresses failed so the composer
 * can name them instead of showing a bare count.
 */
export async function sendBroadcastEmails(
  recipients: RecipientVars[],
  tpl: BroadcastTemplate,
): Promise<{ sent: number; failed: number; failedEmails: string[] }> {
  const resend = getResend()
  let sent = 0
  const failedEmails: string[] = []

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map(r => {
      const { subject, html } = buildBroadcastEmail(tpl, r)
      return { from: FROM, to: r.email, subject, html }
    })
    try {
      const { error } = await resend.batch.send(payload)
      if (error) failedEmails.push(...chunk.map(r => r.email))
      else sent += chunk.length
    } catch {
      failedEmails.push(...chunk.map(r => r.email))
    }
  }

  return { sent, failed: failedEmails.length, failedEmails }
}
