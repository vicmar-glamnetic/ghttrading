'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Mail, Search, Send, Eye, EyeOff, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnlineAvatar } from '@/components/ui/OnlineAvatar'
import { ACCM_REGISTER_URL } from '@/lib/billing'
import {
  AUDIENCES, DEFAULT_AUDIENCE, TOKENS, applyTokens, escapeHtml, isSafeUrl, renderBody,
  type AudienceValue,
} from '@/lib/broadcast'

interface Recipient {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  accmMember: boolean
  accmNumber: string | null
  accmVerifyStatus: string
  subscriptionStatus: string
  createdAt: string
  lastSeenAt: string | null
}

const PAGE_SIZE = 50

const inputCls =
  'w-full bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3'

/** Starter copy — the follow-up the composer was built for, editable like anything else. */
const STARTER_SUBJECT = '{{firstName}}, finish opening your ACCM account'
const STARTER_BODY = `Hey {{firstName}},

You signed up to the GHT Community but we can't see an ACCM account on your profile yet — that's the one step between you and free access to the signals, the live room and the full course library.

It takes about five minutes:

- Open your ACCM account through our partner link below
- Fund it to unlock the welcome bonus
- Add your ACCM number in Settings so we can match it to your profile

Any trouble on the way, just reply to this email and we'll walk you through it.`

export default function AdminEmailPage() {
  const [audience, setAudience] = useState<AudienceValue>(DEFAULT_AUDIENCE)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [users, setUsers] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [subject, setSubject] = useState(STARTER_SUBJECT)
  const [body, setBody] = useState(STARTER_BODY)
  const [ctaLabel, setCtaLabel] = useState('Open my ACCM account →')
  const [ctaUrl, setCtaUrl] = useState(ACCM_REGISTER_URL)
  const [extra, setExtra] = useState('')
  const [showPreview, setShowPreview] = useState(true)

  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ audience })
      if (q.trim()) p.set('q', q.trim())
      const res = await fetch(`/api/admin/email?${p.toString()}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      if (data.audienceCounts) setCounts(data.audienceCounts)
    } finally {
      setLoading(false)
    }
  }, [audience, q])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce the search box
    return () => clearTimeout(t)
  }, [load])

  // Switching audience starts a fresh list; a stale tick from the old bucket
  // would otherwise sit in the selection, invisible and still get mailed.
  function chooseAudience(next: AudienceValue) {
    if (next === audience) return
    setAudience(next)
    setSelected(new Set())
    setPage(1)
  }

  function search(next: string) {
    setQ(next)
    setPage(1) // the old page number means nothing against a new result set
  }

  const typedEmails = useMemo(
    () => extra.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean),
    [extra],
  )
  // A typed address that belongs to someone already ticked isn't a second
  // recipient — the send route mails each address once, and the count says so.
  const uniqueTyped = useMemo(() => {
    const picked = new Set(users.filter(u => selected.has(u.id)).map(u => u.email.toLowerCase()))
    return typedEmails.filter(e => !picked.has(e.toLowerCase()))
  }, [typedEmails, users, selected])
  const totalRecipients = selected.size + uniqueTyped.length

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const paged = users.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)
  const allShownSelected = users.length > 0 && users.every(u => selected.has(u.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Selects everything the current filter matched, not just the visible page —
  // otherwise "select all" on a 200-name list quietly means 50.
  function toggleAll() {
    setSelected(allShownSelected ? new Set() : new Set(users.map(u => u.id)))
  }

  function insertToken(token: string) {
    const el = bodyRef.current
    if (!el) { setBody(b => b + token); return }
    const start = el.selectionStart, end = el.selectionEnd
    setBody(b => b.slice(0, start) + token + b.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  // Preview against a real selected member where there is one, so the tokens
  // resolve to actual data rather than placeholders.
  const previewVars = useMemo(() => {
    const first = users.find(u => selected.has(u.id)) ?? users[0]
    return first
      ? { email: first.email, name: first.name, accmNumber: first.accmNumber }
      : { email: 'trader@example.com', name: 'Sample Trader', accmNumber: null }
  }, [users, selected])

  const previewHtml = useMemo(() => {
    const cta = ctaLabel.trim() && ctaUrl.trim() && isSafeUrl(ctaUrl)
      ? `<div style="text-align:center;margin-top:8px;">
           <a href="#" style="display:inline-block;background:#ad9045;color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">${escapeHtml(applyTokens(ctaLabel, previewVars))}</a>
         </div>`
      : ''
    return renderBody(applyTokens(body, previewVars)) + cta
  }, [body, ctaLabel, ctaUrl, previewVars])

  const canSend = subject.trim() && body.trim() && totalRecipients > 0 && !sending

  async function send() {
    if (!canSend) return
    if (!confirm(
      `Send "${applyTokens(subject, previewVars)}" to ${totalRecipients} recipient${totalRecipients === 1 ? '' : 's'}?\n\n` +
      'This goes out immediately and cannot be recalled.',
    )) return

    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, body, ctaLabel, ctaUrl,
          userIds: [...selected],
          extraEmails: typedEmails,
        }),
      })
      const d = await res.json()
      if (!res.ok) setResult({ ok: false, text: d.error || 'Failed to send.' })
      else setResult({
        ok: d.failed === 0,
        text: `Sent to ${d.sent} of ${d.total}` +
          (d.failed ? ` · ${d.failed} failed${d.failedEmails?.length ? `: ${d.failedEmails.join(', ')}` : ''}` : ''),
      })
      if (res.ok && d.failed === 0) { setSelected(new Set()); setExtra('') }
    } catch {
      setResult({ ok: false, text: 'Failed to send.' })
    } finally {
      setSending(false)
    }
  }

  async function sendTest() {
    if (!subject.trim() || !body.trim()) {
      setResult({ ok: false, text: 'Write a subject and a message first.' })
      return
    }
    setTesting(true); setResult(null)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, ctaLabel, ctaUrl, test: true }),
      })
      const d = await res.json()
      setResult(res.ok && d.sent
        ? { ok: true, text: `Test sent to ${d.to}. Check your inbox.` }
        : { ok: false, text: d.error || 'Test send failed.' })
    } catch {
      setResult({ ok: false, text: 'Test send failed.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Admin · Email</h1>
      </div>
      <p className="text-xs text-ink3">
        Write a message, pick who gets it, send. Nothing is queued or scheduled — hitting send mails
        the selected people straight away.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- compose ---------- */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className={`${inputCls} mt-1`} placeholder="Subject line" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Message</label>
                <span className="text-[10px] text-ink3">**bold** · [link](https://…) · &ldquo;- &rdquo; for bullets</span>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={14}
                className={`${inputCls} mt-1 resize-y leading-relaxed`}
                placeholder="Write your message…"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOKENS.map(({ token, desc }) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    title={desc}
                    className="rounded-md border border-line bg-elevated px-2 py-1 font-mono text-[10px] text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 transition-colors"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Button label <span className="font-normal normal-case">(optional)</span></label>
                <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} className={`${inputCls} mt-1`} placeholder="Open the community →" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Button link</label>
                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className={`${inputCls} mt-1`} placeholder="https://…" />
                {ctaUrl.trim() && !isSafeUrl(ctaUrl) && (
                  <p className="mt-1 text-[10px] text-red-400">Must start with https:// or mailto:</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Also send to <span className="font-normal normal-case">(optional, comma-separated)</span></label>
              <input value={extra} onChange={e => setExtra(e.target.value)} className={`${inputCls} mt-1`} placeholder="someone@example.com, another@example.com" />
              {typedEmails.length > 0 && (
                <p className="mt-1 text-[10px] text-ink3">{typedEmails.length} typed address{typedEmails.length === 1 ? '' : 'es'} — tokens fall back to defaults for these.</p>
              )}
            </div>
          </div>

          {/* preview */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
                {showPreview ? <Eye className="w-4 h-4 text-yellow-500" /> : <EyeOff className="w-4 h-4 text-ink3" />}
                Preview
              </span>
              <span className="text-[10px] text-ink3">
                {showPreview ? 'as ' + (previewVars.name || previewVars.email) : 'show'}
              </span>
            </button>
            {showPreview && (
              <div className="border-t border-line p-4">
                <p className="mb-3 text-xs text-ink3">
                  <span className="text-ink2 font-semibold">Subject:</span> {applyTokens(subject, previewVars) || <em className="text-ink3">(empty)</em>}
                </p>
                <div className="rounded-xl bg-[#16161f] border border-[#2a2a3a] p-5">
                  <p className="mb-4 text-center text-lg font-black text-white">
                    GHT <span className="text-[#ad9045]">Community</span>
                  </p>
                  <div
                    className="[&_a]:text-[#ad9045] [&_li]:text-[#9090a8] [&_p]:text-[#9090a8] [&_strong]:text-[#f0f0f8] text-sm"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------- recipients ---------- */}
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] text-ink3 uppercase tracking-wider">Audience</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {AUDIENCES.map(a => (
                <button
                  key={a.value}
                  onClick={() => chooseAudience(a.value)}
                  title={a.hint}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    audience === a.value
                      ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500'
                      : 'border-line bg-elevated text-ink3 hover:text-ink2'
                  }`}
                >
                  {a.label}
                  {counts[a.value] !== undefined && (
                    <span className="ml-1.5 text-[10px] text-ink3 tabular-nums">{counts[a.value]}</span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-ink3">{AUDIENCES.find(a => a.value === audience)?.hint}</p>

            <div className="relative">
              <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={e => search(e.target.value)}
                placeholder="Search inside this audience…"
                className={`${inputCls} pl-9`}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={toggleAll}
                disabled={users.length === 0}
                className="text-xs font-semibold text-yellow-500 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {allShownSelected ? 'Clear selection' : `Select all ${users.length}`}
              </button>
              <span className="text-[11px] text-ink3 tabular-nums">
                {selected.size} selected
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto divide-y divide-line">
              {loading ? (
                <p className="p-8 text-center text-sm text-ink3">
                  <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : users.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink3">Nobody matches this audience.</p>
              ) : paged.map(u => (
                <label
                  key={u.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                    selected.has(u.id) ? 'bg-yellow-500/5' : 'hover:bg-elevated/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="h-4 w-4 shrink-0 accent-yellow-500"
                  />
                  <OnlineAvatar src={u.image} name={u.name} size="sm" lastSeenAt={u.lastSeenAt} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{u.name || 'Unnamed'}</p>
                    <p className="truncate text-xs text-ink3">{u.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                      u.accmMember
                        ? 'bg-green-400/10 text-green-400 border-green-400/30'
                        : 'bg-elevated text-ink2 border-line'
                    }`}>
                      {u.accmMember ? (u.accmNumber ? `#${u.accmNumber}` : 'No ACCM #') : 'Standard'}
                    </span>
                    <p className="mt-0.5 text-[10px] text-ink3">{format(new Date(u.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </label>
              ))}
            </div>

            {!loading && users.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                <p className="text-[11px] text-ink3">
                  {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, users.length)} of {users.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pageSafe <= 1}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-1 text-[11px] text-ink3 tabular-nums">{pageSafe} / {pageCount}</span>
                  <button
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={pageSafe >= pageCount}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink2 hover:border-yellow-500/40 hover:text-yellow-500 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- send bar ---------- */}
      <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-xl border border-line bg-surface/95 backdrop-blur p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {totalRecipients === 0 ? 'No recipients picked' : `${totalRecipients} recipient${totalRecipients === 1 ? '' : 's'}`}
          </p>
          {result && (
            <p className={`truncate text-xs ${result.ok ? 'text-green-400' : 'text-red-400'}`}>{result.text}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={sendTest} loading={testing} className="text-xs">
            Send test to me
          </Button>
          <Button variant="gold" size="sm" onClick={send} loading={sending} disabled={!canSend} className="gap-1.5 text-xs">
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        </div>
      </div>
    </div>
  )
}
