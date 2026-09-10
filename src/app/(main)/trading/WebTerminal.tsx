'use client'
import { useMemo, useState } from 'react'
import type { BrokerMt5Server } from '@/lib/brokers'

/**
 * A partner broker's MetaTrader 5 web terminal, embedded.
 *
 * Every partner's terminal is on offer here, not just the one the member
 * registered under, because plenty of them hold accounts at both. The server is
 * fixed on the broker's side — one terminal host per server, with no parameter
 * to point one at another — so switching means swapping the whole iframe.
 *
 * `mode=connect` opens the terminal straight on its login dialog instead of a
 * blank chart, and `lang=en` keeps it in English regardless of the browser.
 */
export function WebTerminal({ servers }: { servers: readonly BrokerMt5Server[] }) {
  const [name, setName] = useState(servers[0]?.name)
  const active = servers.find(s => s.name === name) ?? servers[0]

  // Group the picker by broker so ten server names stay readable.
  const groups = useMemo(() => {
    const by = new Map<string, BrokerMt5Server[]>()
    for (const s of servers) by.set(s.brokerLabel, [...(by.get(s.brokerLabel) ?? []), s])
    return [...by]
  }, [servers])

  if (!active) return null

  return (
    <div className="bg-surface border border-line rounded-2xl p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">
          MetaTrader 5 · Web Terminal
          <span className="hidden sm:inline text-ink2 normal-case tracking-normal font-semibold"> · {active.brokerLabel}</span>
        </p>
        {/* The "Server" label goes on phones, where it costs the longest server
            name the room to show in full; aria-label carries it instead. */}
        {servers.length > 1 && (
          <label className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-[10px] font-bold text-ink3 uppercase tracking-wider shrink-0">Server</span>
            <select
              value={active.name}
              onChange={e => setName(e.target.value)}
              aria-label="Web terminal server"
              className="min-w-0 bg-sunken border border-line rounded-lg text-xs text-ink font-mono px-2 py-1.5 focus:outline-none focus:border-yellow-500/40"
            >
              {groups.map(([broker, list]) => (
                <optgroup key={broker} label={broker}>
                  {list.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </optgroup>
              ))}
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
        Pick the server your account is on — your approval email names it — then log in with that account
        number and password. The session runs on {active.brokerLabel}&apos;s own MetaQuotes terminal, so we
        never see your trading password. Needs WebGL, so a very old browser will be turned away; the apps
        below always work.
      </p>
    </div>
  )
}
