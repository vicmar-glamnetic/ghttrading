import { Monitor, Smartphone, Download, Apple } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { CopyField } from './CopyField'
import { WebTerminal } from './WebTerminal'
import { brokerFrom, brokerOf } from '@/lib/brokers'

export const metadata = { title: 'Trading · Gold Heist Trading' }

/**
 * Trade in the browser, or get the app.
 *
 * The embedded terminal is the broker's OWN MetaQuotes-hosted MT5 terminal (see
 * `Mt5Server.terminalUrl`), not MetaQuotes' generic one. That distinction is the
 * whole reason earlier attempts at this failed: metatraderweb.app — the host
 * every "embed the WebTerminal" guide points at — serves only the MT4 terminal,
 * and asking it for an MT5 server logs "Web Terminal is not supported by this
 * MetaTrader 5 Server" for every server including MetaQuotes' own demo. Our
 * members are all on MT5.
 *
 * So an MT5 embed needs a per-broker terminal, which both our partners run and
 * iframe on their own sites. Neither sends framing headers.
 */

// Official MetaTrader 5 downloads (work with any broker/server).
const DOWNLOADS = [
  { label: 'Windows', icon: Monitor,    href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { label: 'macOS',   icon: Apple,      href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg' },
  { label: 'Android', icon: Smartphone, href: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5' },
  { label: 'iOS',     icon: Apple,      href: 'https://apps.apple.com/app/metatrader-5/id413251709' },
]

export default async function TradingPage() {
  // Which broker a member trades with decides the terminal we embed and the
  // server they need — a VT Markets member sent to ACCM's terminal gets
  // nowhere. The (main) layout has already required a session; fall back to the
  // registry default if somehow there isn't one.
  const session = await auth()
  const row = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { broker: true, accmMember: true } })
    : null
  const broker = row ? brokerOf(brokerFrom(row)) : brokerOf(null)
  const servers = broker.mt5Servers
  // One server means we can hand it over outright; several means only their
  // approval email says which of them is theirs.
  const theServer = servers.length === 1 ? servers[0].name : null
  const embeddable = servers.filter(s => s.terminalUrl)

  return (
    <div className={embeddable.length ? 'space-y-6 max-w-4xl mx-auto' : 'space-y-6 max-w-2xl mx-auto'}>
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">Trading</h1>
        <p className="text-ink2 text-sm mt-2">
          {embeddable.length
            ? <>Trade your {broker.full} MetaTrader 5 account right here in your browser — or use the desktop and mobile apps.</>
            : <>Trade with your broker&apos;s MetaTrader 5 account. Install the app, then log in with the details below.</>}
        </p>
      </div>

      {embeddable.length > 0 && <WebTerminal servers={embeddable} />}

      {/* Login details */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Your login details</p>

        {theServer && <CopyField label="Server" value={theServer} />}

        {servers.length > 1 && (
          <div className="rounded-lg bg-sunken border border-line px-3 py-2">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Server</p>
            <p className="text-xs text-ink2 mt-1">
              {broker.full} runs several — your approval email names yours:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {servers.map(s => (
                <span key={s.name} className="font-mono text-[11px] text-ink bg-elevated border border-line rounded px-1.5 py-0.5">{s.name}</span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-ink2">
          Use the <span className="font-semibold text-ink">Login</span> (account number) and{' '}
          <span className="font-semibold text-ink">password</span> from your{' '}
          {broker.partner ? broker.full : 'broker'} approval email.
          {!servers.length && ' Your broker’s email also names the server to connect to.'}
          {broker.registerUrl && (
            <>
              {' '}Don&apos;t have an account yet?{' '}
              <a href={broker.registerUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400">
                Open one with {broker.full}
              </a>.
            </>
          )}
        </p>
      </div>

      {/* Prefer the app? */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">
          {embeddable.length ? 'Prefer the app? Get MetaTrader 5' : '1 · Get MetaTrader 5'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DOWNLOADS.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-sunken hover:border-yellow-500/40 hover:bg-elevated transition-colors py-4"
            >
              <Icon className="w-6 h-6 text-yellow-500" />
              <span className="text-xs font-semibold text-ink">{label}</span>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-ink3 mt-2 flex items-start gap-1">
          <Download className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Official MetaTrader 5 apps — they work with any broker. In the app, go to File → Login to
            Trade Account (desktop) or Settings → New Account (mobile), search for{' '}
            {theServer
              ? <span className="font-semibold text-ink">{theServer}</span>
              : 'your server'}, then enter your login and password.
          </span>
        </p>
      </div>

      <p className="text-[10px] text-ink3 text-center">
        MetaTrader 5 © MetaQuotes Ltd. Trading involves risk — trade responsibly.
      </p>
    </div>
  )
}
