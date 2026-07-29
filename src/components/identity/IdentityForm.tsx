'use client'
import { useState } from 'react'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { updateMyProfile } from '@/lib/useMyProfile'
import {
  NAME_SEP, buildDisplayName, normalizeAccmNumber,
  validateAccmNumber, validateNamePart, validateRealName,
} from '@/lib/identity'

export interface IdentityState {
  name: string | null
  namePart: string
  realName: string | null
  accmNumber: string | null
  accmVerifyStatus: string
  accmRejectReason?: string | null
  complete: boolean
}

const inputCls =
  'w-full text-sm bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-ink placeholder:text-ink3 focus:outline-none focus:border-yellow-500/50 transition-colors'

/**
 * The one place a member sets their display name, real name and ACCM number.
 * Used by the blocking gate on first run and by Settings afterwards.
 *
 * Changing details that already exist triggers a step-up: the server answers 428
 * and we collect a code e-mailed to the account address before retrying.
 */
export function IdentityForm({ initial, onSaved, submitLabel = 'Save' }: {
  initial: IdentityState
  onSaved: (next: IdentityState) => void
  submitLabel?: string
}) {
  const [namePart, setNamePart] = useState(initial.namePart)
  const [realName, setRealName] = useState(initial.realName ?? '')
  const [accmNumber, setAccmNumber] = useState(initial.accmNumber ?? '')
  const [code, setCode] = useState('')

  const [needsCode, setNeedsCode] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const cleanNumber = normalizeAccmNumber(accmNumber)
  const preview = namePart.trim() && cleanNumber ? buildDisplayName(namePart, cleanNumber) : null

  async function requestCode() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/me/identity/code', { method: 'POST' })
      const d = await res.json().catch(() => null)
      if (!res.ok) throw new Error(d?.error || 'We couldn’t send the code. Please try again.')
      setSentTo(d?.email ?? null)
      setNotice(`We sent a 6-digit code to ${d?.email ?? 'your e-mail'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t send the code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)

    // Same rules the server enforces — catch mistakes before a round trip.
    const localError =
      validateAccmNumber(accmNumber) ?? validateNamePart(namePart) ?? validateRealName(realName)
    if (localError) { setError(localError); return }
    if (needsCode && code.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code we e-mailed you.'); return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/me/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namePart, realName, accmNumber, ...(needsCode ? { code } : {}) }),
      })
      const d = await res.json().catch(() => null)

      // 428 = the change is allowed but must be confirmed by e-mail first.
      if (res.status === 428 || (d?.codeRequired && !res.ok && !needsCode)) {
        setNeedsCode(true)
        setError(null)
        await requestCode()
        return
      }
      if (!res.ok) throw new Error(d?.error || 'Something went wrong. Please try again.')

      setCode('')
      setNeedsCode(false)
      updateMyProfile({ name: d.name })   // nav/composer avatars pick it up at once
      onSaved(d as IdentityState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Display name */}
      <div>
        <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">
          Display name
        </label>
        <input
          value={namePart}
          onChange={e => { setNamePart(e.target.value); setError(null) }}
          placeholder="Vicmar"
          autoComplete="off"
          className={inputCls}
        />
        <p className="mt-1.5 text-[11px] text-ink3">
          Your ACCM number is added automatically — you only type the name.
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-elevated border border-line px-3 py-2">
          <Lock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          <span className="text-xs text-ink2">
            Shows as{' '}
            <span className="font-bold text-ink">
              {preview ?? `Your name${NAME_SEP}your ACCM number`}
            </span>
          </span>
        </div>
      </div>

      {/* Real name — private */}
      <div>
        <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">
          Real name
        </label>
        <input
          value={realName}
          onChange={e => { setRealName(e.target.value); setError(null) }}
          placeholder="Vicmar Yanson"
          autoComplete="name"
          className={inputCls}
        />
        <p className="mt-1.5 text-[11px] text-ink3">
          As it appears on your ACCM account. Only you, the coaches and the admins can see this —
          never other members.
        </p>
      </div>

      {/* ACCM number */}
      <div>
        <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">
          ACCM account number
        </label>
        <input
          value={accmNumber}
          onChange={e => { setAccmNumber(e.target.value); setError(null) }}
          placeholder="166738"
          inputMode="numeric"
          autoComplete="off"
          className={inputCls}
        />
      </div>

      {/* Step-up code */}
      {needsCode && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-yellow-500 shrink-0" />
            <p className="text-xs font-bold text-ink">Confirm it&apos;s you</p>
          </div>
          <p className="text-[11px] text-ink2 leading-relaxed">
            These details are already on file, so we e-mailed a 6-digit code to{' '}
            <span className="font-semibold text-ink">{sentTo ?? 'your address'}</span>. Enter it to save the change.
          </p>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={`${inputCls} mt-2.5 text-center text-lg font-black tracking-[0.4em]`}
          />
          <button
            type="button"
            onClick={requestCode}
            disabled={sending}
            className="mt-2 text-[11px] font-semibold text-yellow-500 hover:underline disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send another code'}
          </button>
        </div>
      )}

      {notice && !error && <p className="text-xs font-semibold text-green-500">{notice}</p>}
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving || sending}
        className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black rounded-lg py-2.5 transition-colors"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : <><ShieldCheck className="w-4 h-4" /> {submitLabel}</>}
      </button>
    </form>
  )
}
