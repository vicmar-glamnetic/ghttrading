'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { BILLING } from '@/lib/billing'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-sunken border border-line px-2.5 py-2 mt-1">
        <span className="text-sm text-ink font-semibold flex-1 break-all">{value}</span>
        <button
          onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }}
          className="shrink-0 text-ink3 hover:text-yellow-500 transition-colors"
          title={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export function GcashMayaPay({ amountPhp, email }: { amountPhp: number; email: string }) {
  const [ref, setRef] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const hasMaya = Boolean(BILLING.mayaNumber)

  async function claim() {
    setClaiming(true)
    try {
      const res = await fetch('/api/billing/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      })
      if (res.ok) setClaimed(true)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 mt-4">
      <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Pay with GCash{hasMaya ? ' or Maya' : ''}</p>
      <p className="text-xs text-ink3 mb-3">
        Send <span className="text-ink font-semibold">₱{amountPhp.toLocaleString('en-PH')}</span> to the account below, then tap “I&apos;ve paid”.
      </p>

      {/* GCash */}
      <div className="rounded-xl border border-line p-4">
        <p className="text-xs font-bold text-blue-400 mb-2">GCash</p>
        <div className="flex gap-4 items-start">
          {BILLING.gcashQrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={BILLING.gcashQrUrl} alt="GCash QR" width={96} height={96} className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <CopyField label="GCash number" value={BILLING.gcashNumber} />
            <CopyField label="Account name" value={BILLING.gcashName} />
          </div>
        </div>
      </div>

      {/* Maya (only if configured) */}
      {hasMaya && (
        <div className="rounded-xl border border-line p-4 mt-3">
          <p className="text-xs font-bold text-green-400 mb-2">Maya</p>
          <div className="flex gap-4 items-start">
            {BILLING.mayaQrUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={BILLING.mayaQrUrl} alt="Maya QR" width={96} height={96} className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <CopyField label="Maya number" value={BILLING.mayaNumber} />
              <CopyField label="Account name" value={BILLING.mayaName} />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-ink2 mt-3 leading-relaxed">
        After sending, tap “I&apos;ve paid” below (and message a screenshot to {BILLING.proofContact} to speed things up).
        We&apos;ll verify and activate your account{email ? <> for <span className="text-ink font-semibold">{email}</span></> : ''} within a few hours.
      </p>

      {/* Claim */}
      <div className="mt-4 pt-4 border-t border-line">
        {claimed ? (
          <p className="text-sm text-green-400 font-semibold">✅ Got it! We&apos;ll verify your payment and activate your account shortly.</p>
        ) : (
          <>
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1.5">Already paid? Let us know</p>
            <div className="flex gap-2">
              <input
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="GCash/Maya reference no. (optional)"
                className="flex-1 bg-sunken border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-yellow-500/40 placeholder-ink3"
              />
              <button
                onClick={claim}
                disabled={claiming}
                className="shrink-0 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
              >
                {claiming ? 'Sending…' : "I've paid"}
              </button>
            </div>
            <p className="text-[10px] text-ink3 mt-1.5">This flags your account for review — we&apos;ll activate it once the payment lands.</p>
          </>
        )}
      </div>
    </div>
  )
}
