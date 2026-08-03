/**
 * Shared pieces of the admin email composer: the audiences staff can pull a
 * recipient list from, the tokens a message can interpolate, and the small
 * markdown → HTML renderer.
 *
 * Deliberately free of server-only imports: the composer's live preview runs
 * these exact functions in the browser, so what an admin sees before hitting
 * send is the same HTML the send path mails out.
 */

/**
 * Recipient buckets. Each one is a saved filter, not a saved list — the API
 * re-runs it on every load, so a member who verifies (or lapses) moves between
 * buckets on their own.
 */
export const AUDIENCES = [
  {
    value: 'accm-no-account',
    label: 'No ACCM account yet',
    hint: 'ACCM-tier members who never entered an account number — the sign-up follow-up list.',
  },
  {
    value: 'accm-unverified',
    label: 'ACCM · not verified',
    hint: 'ACCM members who have never submitted proof of their account.',
  },
  {
    value: 'accm-pending',
    label: 'ACCM · in review',
    hint: 'Members whose proof is sitting in the verification queue.',
  },
  {
    value: 'standard',
    label: 'Standard ($5)',
    hint: 'Members on the non-ACCM tier.',
  },
  {
    value: 'expired',
    label: 'Access expired',
    hint: 'Members with no active or comped subscription and no trial left.',
  },
  {
    value: 'inactive',
    label: 'Inactive 30+ days',
    hint: "Members who haven't opened the app in the last 30 days.",
  },
  {
    value: 'members',
    label: 'All members',
    hint: 'Every member account. Staff excluded.',
  },
  {
    value: 'everyone',
    label: 'Everyone',
    hint: 'Every account on the site, staff included.',
  },
] as const

export type AudienceValue = (typeof AUDIENCES)[number]['value']

export const DEFAULT_AUDIENCE: AudienceValue = 'accm-no-account'

export function isAudience(v: string | null | undefined): v is AudienceValue {
  return AUDIENCES.some(a => a.value === v)
}

/** What a message can address a recipient by. */
export interface RecipientVars {
  email: string
  name?: string | null
  accmNumber?: string | null
}

/**
 * Tokens usable in the subject and body. Every one has a fallback, so a message
 * written for members with a name still reads correctly for the account that
 * signed up with nothing but an email.
 */
export const TOKENS = [
  { token: '{{firstName}}', desc: 'First name — "trader" if we don\'t have one' },
  { token: '{{name}}', desc: 'Full display name — "trader" if we don\'t have one' },
  { token: '{{email}}', desc: 'Their email address' },
  { token: '{{accmNumber}}', desc: 'Their ACCM account number — "—" if not set yet' },
] as const

/** Fills the {{tokens}} in a message for one recipient. Plain text in, plain text out. */
export function applyTokens(text: string, v: RecipientVars): string {
  // The display name carries the ACCM number ("Vicmar - 166738"); an email
  // greeting wants the human part only.
  const full = (v.name ?? '').split(' - ')[0].trim()
  const first = full.split(/\s+/)[0] || ''
  return text
    .replace(/\{\{\s*firstName\s*\}\}/gi, first || 'trader')
    .replace(/\{\{\s*name\s*\}\}/gi, full || 'trader')
    .replace(/\{\{\s*email\s*\}\}/gi, v.email)
    .replace(/\{\{\s*accmNumber\s*\}\}/gi, v.accmNumber || '—')
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Only ever emit links we'd be happy to have clicked — no javascript:/data: URLs. */
export function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(url.trim())
}

/**
 * Markdown-lite → email HTML. Supports what staff actually reach for when
 * writing a nudge: paragraphs, line breaks, **bold**, [links](url) and `- `
 * bullets. Everything is escaped first, so the message body can never inject
 * markup into the email.
 */
export function renderBody(text: string): string {
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f0f8;">$1</strong>')
      // Links are matched on the escaped text, so the URL here is already safe
      // to drop into an attribute.
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, href: string) =>
        isSafeUrl(href)
          ? `<a href="${href}" style="color:#ad9045;text-decoration:underline;">${label}</a>`
          : m,
      )

  const P = 'margin:0 0 16px;font-size:14px;color:#9090a8;line-height:1.6;'

  return text
    .split(/\n{2,}/)
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) return ''
      if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
        const items = lines
          .map(l => `<li style="margin:0 0 6px;">${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('')
        return `<ul style="${P}padding-left:20px;">${items}</ul>`
      }
      return `<p style="${P}">${lines.map(inline).join('<br>')}</p>`
    })
    .filter(Boolean)
    .join('')
}
