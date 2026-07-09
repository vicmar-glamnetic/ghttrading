'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShieldCheck, Lock, Fingerprint, Bell, Wifi, ScanLine, CheckCircle2, Globe, Smartphone,
} from 'lucide-react'

const PROTECTIONS = [
  { icon: Lock,        label: 'AES-256 Encryption',   desc: 'All data encrypted end-to-end' },
  { icon: Fingerprint, label: 'Two-Factor Auth',      desc: 'Device fingerprint verified' },
  { icon: Bell,        label: 'Login Alerts',         desc: 'Real-time sign-in monitoring' },
  { icon: ShieldCheck, label: 'Anti-Phishing',        desc: 'Malicious link protection on' },
  { icon: Wifi,        label: 'DDoS Shield',          desc: 'Traffic filtering active' },
  { icon: Globe,       label: 'Secure Connection',    desc: 'TLS 1.3 · verified certificate' },
]

const SESSIONS = [
  { device: 'This device', where: 'Active now', icon: Smartphone, current: true },
]

export default function AntiHackingPage() {
  const { data: session } = useSession()
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastScan, setLastScan] = useState<string | null>(null)

  function runScan() {
    if (scanning) return
    setScanning(true)
    setProgress(0)
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(id)
          setScanning(false)
          setLastScan('just now')
          return 100
        }
        return p + 5
      })
    }, 60)
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Anti-Hacking</h1>
      </div>

      {/* Protected banner */}
      <div className="relative overflow-hidden rounded-2xl border border-green-400/30 bg-linear-to-br from-green-400/10 to-green-500/5 p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-400/15 border border-green-400/30 mb-3">
          <ShieldCheck className="w-9 h-9 text-green-400" />
        </div>
        <h2 className="text-xl font-black text-ink">You&apos;re Protected</h2>
        <p className="text-sm text-ink2 mt-1">
          {session?.user?.name ? `${session.user.name}, your` : 'Your'} account is secured with bank-grade protection.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> All systems secure
        </div>
      </div>

      {/* Security scan */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Security scan</p>
            <p className="text-xs text-ink3">
              {lastScan ? `No threats detected · last scan ${lastScan}` : 'Run a full protection scan'}
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black rounded-lg px-3 py-2 transition-colors"
          >
            <ScanLine className="w-3.5 h-3.5" /> {scanning ? 'Scanning…' : 'Run scan'}
          </button>
        </div>
        {(scanning || progress > 0) && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-elevated overflow-hidden">
              <div className="h-full bg-green-400 transition-[width] duration-75" style={{ width: `${progress}%` }} />
            </div>
            {progress >= 100 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> No threats found. Your account is clean.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Protections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROTECTIONS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="w-9 h-9 rounded-lg bg-green-400/10 border border-green-400/20 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              </div>
              <p className="text-xs text-ink3">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active sessions */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink mb-3">Active sessions</p>
        <div className="space-y-2">
          {SESSIONS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-sunken border border-line p-3">
              <s.icon className="w-4 h-4 text-ink2 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{s.device}</p>
                <p className="text-xs text-ink3">{s.where}</p>
              </div>
              {s.current && <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 rounded-full px-2 py-0.5">This device</span>}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-ink3 text-center">
        Gold Heist Trading uses industry-standard protection to keep your account and data safe.
      </p>
    </div>
  )
}
