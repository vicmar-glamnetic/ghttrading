'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-sunken border border-line px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">{label}</p>
        <p className="font-mono text-sm text-ink truncate">{value}</p>
      </div>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }}
        className="shrink-0 text-ink3 hover:text-yellow-500 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}
