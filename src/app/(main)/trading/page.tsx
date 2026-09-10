import { Monitor, Smartphone, Download, Apple } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { CopyField } from './CopyField'
import { brokerFrom, brokerOf } from '@/lib/brokers'

export const metadata = { title: 'Trading · Gold Heist Trading' }

/**
 * Why this page hands out login details instead of embedding a web terminal:
 *
 * MetaQuotes' embeddable terminal (metatraderweb.app/trade, the one every
 * "put the WebTerminal on your site" guide points at) is MT4-only — it serves
 * one bundle, mt4.<lang>.js, still on build 240 from Sep 2023, and asking it for
 * an MT5 server logs "Web Terminal is not supported by this MetaTrader 5
 * Server" no matter which server you name (MetaQuotes-Demo included). Our
 * members' accounts are MT5, and ACCM has no MT4 server at all.
 *
 * MT5 web trading moved to web.metatrader.app/terminal, which is provisioned
 * per broker: the server is baked into the HTML and no query parameter
 * overrides it. So embedding one for ACCM needs ACCM's own web-terminal URL,
 * which they'd have to ask MetaQuotes to issue. Until they do, the apps below
 * are the only way in, and the server names are the part members get wrong.
 *
 * (Framing isn't the obstacle, in case that's the next thing tried:
 * metatraderweb.app sends no X-Frame-Options, though trade.mql5.com sends
 * SAMEORIGIN on its redirect there.)
 */

// Official MetaTrader 5 downloads (work with any broker/server).
const DOWNLOADS = [
  { label: 'Windows', icon: Monitor,    href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { label: 'macOS',   icon: Apple,      href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg' },
  { label: 'Android', icon: Smartphone, href: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5' },
  { label: 'iOS',     icon: Apple,      href: 'https://apps.apple.com/app/metatrader-5/id413251709' },
]

export default async function TradingPage() {
  // Which broker a member trades with decides the MT5 server they need and the
  // broker named throughout the copy — a VT Markets member told to log into
  // ACCM's server gets nowhere. The (main) layout has already required a
  // session; fall back to the registry default if somehow there isn't one.
  const session = await auth()
  const row = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { broker: true, accmMember: true } })
    : null
  const broker = row ? brokerOf(brokerFrom(row)) : brokerOf(null)
  const servers = broker.mt5Servers
  // One server means we can hand it over outright; several means only their
  // approval email says which of them is theirs.
  const theServer = servers.length === 1 ? servers[0] : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">Trading</h1>
        <p className="text-ink2 text-sm mt-2">
          Trade with your {broker.partner ? broker.full : 'broker'}&apos;s MetaTrader 5 account.
          Install the app, then log in with the details below.
        </p>
      </div>

      {/* Download MT5 */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">1 · Get MetaTrader 5</p>
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
        <p className="text-[10px] text-ink3 mt-2 flex items-center gap-1">
          <Download className="w-3 h-3 shrink-0" />
          Official MetaTrader 5 apps — they work with any broker.
        </p>
      </div>

      {/* Login details */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">2 · Log in to your account</p>

        {theServer && <CopyField label="Server" value={theServer} />}

        {servers.length > 1 && (
          <div className="rounded-lg bg-sunken border border-line px-3 py-2">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Server</p>
            <p className="text-xs text-ink2 mt-1">
              {broker.full} runs several — your approval email names yours:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {servers.map(s => (
                <span key={s} className="font-mono text-[11px] text-ink bg-elevated border border-line rounded px-1.5 py-0.5">{s}</span>
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

      {/* Steps */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">3 · Connect &amp; trade</p>
        <ol className="space-y-2.5 text-sm text-ink">
          {[
            'Install and open MetaTrader 5.',
            'Go to File → Login to Trade Account (desktop) or Settings → New Account (mobile).',
            theServer
              ? `Search for the server "${theServer}" and select it.`
              : 'Search for the server from your approval email and select it.',
            'Enter your login (account number) and password, then connect.',
            'Your charts, symbols and orders load — trade directly.',
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-elevated text-ink2 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-[10px] text-ink3 mt-3">
          MetaTrader has no MT5 browser terminal we can embed here — the app is the way in.
        </p>
      </div>

      <p className="text-[10px] text-ink3 text-center">
        MetaTrader 5 © MetaQuotes Ltd. Trading involves risk — trade responsibly.
      </p>
    </div>
  )
}
