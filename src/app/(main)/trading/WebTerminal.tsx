'use client'
import { useState } from 'react'
import type { Mt5Server } from '@/lib/brokers'

/**
 * The broker's MetaTrader 5 web terminal, embedded.
 *
 * Each server has its own terminal host and the server is fixed on the broker's
 * side, so switching servers means swapping the whole iframe rather than
 * passing a parameter. Members whose broker runs several servers pick theirs
 * here — their approval email says which one it is.
 *
 * `mode=connect` opens the terminal straight on its login dialog instead of a
 * blank chart, and `lang=en` keeps it in English regardless of the browser.
 */
export function WebTerminal({ servers }: { servers: readonly Mt5Server[] }) {
  const [active, setActive] = useState(servers[0])
  if (!active) return null

  return (
    <div className="bg-surface border border-line rounded-2xl p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">MetaTrader 5 · Web Terminal</p>
        {servers.length > 1 && (
          <label className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold text-ink3 uppercase tracking-wider shrink-0">Server</span>
            <select
              value={active.name}
              onChange={e => setActive(servers.find(s => s.name === e.target.value) ?? servers[0])}
              className="min-w-0 bg-sunken border border-line rounded-lg text-xs text-ink font-mono px-2 py-1.5 focus:outline-none focus:border-yellow-500/40"
            >
              {servers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-line bg-white h-[calc(100vh-19rem)] min-h-[520px]">
        <iframe
          // Remount on switch — the terminal boots once and caches its server.
          key={active.terminalUrl}
          src={`${active.terminalUrl}?mode=connect&lang=en`}
          title={`MetaTrader 5 Web Terminal — ${active.name}`}
          allow="clipboard-write; fullscreen"
          className="w-full h-full block"
        />
      </div>

      <p className="text-[10px] text-ink3 mt-2 px-1">
        Log in with the account number and password from your approval email. The session runs on your
        broker&apos;s own MetaQuotes terminal — we never see your trading password. Needs WebGL, so a very
        old browser will be turned away; the apps below always work.
      </p>
    </div>
  )
}
