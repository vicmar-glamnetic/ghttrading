'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { CRYPTO } from '@/lib/billing'

export function CryptoPay({ amountUsd, email, proofContact }: { amountUsd: number; email: string; proofContact: string }) {
  const [copied, setCopied] = useState(false)
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(CRYPTO.address)}`

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 mt-4">
      <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">Or pay with crypto (USDT)</p>
      <p className="text-xs text-ink3 mb-3">
        Send <span className="text-ink font-semibold">${amountUsd}</span> in USDT · <span className="text-ink font-semibold">{CRYPTO.network}</span> network only
      </p>

      <div className="flex gap-4 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="USDT deposit address QR" width={96} height={96} className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Wallet address · {CRYPTO.network}</p>
          <div className="flex items-center gap-2 rounded-lg bg-sunken border border-line px-2.5 py-2 mt-1">
            <code className="text-xs text-ink font-mono break-all flex-1">{CRYPTO.address}</code>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(CRYPTO.address); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }}
              className="shrink-0 text-ink3 hover:text-yellow-500 transition-colors"
              title="Copy address"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-ink2 mt-2 leading-relaxed">
            After sending, message your <span className="text-ink font-semibold">transaction hash</span> and your email{email ? <> (<span className="text-ink font-semibold">{email}</span>)</> : ''} to {proofContact}. We&apos;ll activate you within a few hours.
          </p>
        </div>
      </div>

      <p className="text-[10px] text-red-400 mt-3">
        ⚠️ Send USDT on the <b>{CRYPTO.network}</b> network only — sending on another network will lose your funds.
      </p>
    </div>
  )
}
