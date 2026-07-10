import { Monitor, Smartphone, Download, Apple } from 'lucide-react'
import { CopyField } from './CopyField'

export const metadata = { title: 'Trading · Gold Heist Trading' }

// AC Capital Market MT5 server (from your account approval email).
const MT5_SERVER = 'MT5-ACCapitalMarket(S)-Real'
const BROKER = 'AC Capital Market'

// Server name as recognised by the MetaTrader 5 Web Terminal (no "MT5-" prefix).
// If the terminal reports "server not found", adjust this to match the exact
// name AC Capital Market is registered under on trade.mql5.com.
const WEB_TERMINAL_SERVER = 'ACCapitalMarket(S)-Real'
const WEB_TERMINAL_SRC =
  `https://trade.mql5.com/trade?servers=${encodeURIComponent(WEB_TERMINAL_SERVER)}` +
  `&trade_server=${encodeURIComponent(WEB_TERMINAL_SERVER)}` +
  `&startup_mode=login&lang=en&save_password=on&utm_source=community.ghttrading.co`

// Official MetaTrader 5 downloads (work with any broker/server).
const DOWNLOADS = [
  { label: 'Windows', icon: Monitor,    href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { label: 'macOS',   icon: Apple,      href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg' },
  { label: 'Android', icon: Smartphone, href: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5' },
  { label: 'iOS',     icon: Apple,      href: 'https://apps.apple.com/app/metatrader-5/id413251709' },
]

export default function TradingPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">Trading</h1>
        <p className="text-ink2 text-sm mt-2">
          Trade your {BROKER} MetaTrader 5 account right here in your browser — or use the desktop / mobile app.
        </p>
      </div>

      {/* Embedded MT5 Web Terminal */}
      <div className="bg-surface border border-line rounded-2xl p-3 sm:p-4">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3 px-1">MetaTrader 5 · Web Terminal</p>
        <div className="rounded-xl overflow-hidden border border-line bg-sunken">
          <iframe
            src={WEB_TERMINAL_SRC}
            title="MetaTrader 5 Web Terminal"
            allow="clipboard-write; fullscreen"
            className="w-full h-[70vh] min-h-140 block"
          />
        </div>
        <p className="text-[10px] text-ink3 mt-2 px-1">
          Log in with your {BROKER} account number and password. Your session runs securely on MetaQuotes&apos; servers.
        </p>
      </div>

      {/* Login details */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Your login details</p>
        <CopyField label="Server" value={MT5_SERVER} />
        <p className="text-xs text-ink2">
          Use the <span className="font-semibold text-ink">Login</span> (account number) and{' '}
          <span className="font-semibold text-ink">password</span> from your {BROKER} approval email.
          Don&apos;t have an account yet?{' '}
          <a href="https://www.accapitalmarket.com" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400">Open one with {BROKER}</a>.
        </p>
      </div>

      {/* Prefer the app? */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">Prefer the app? Get MetaTrader 5</p>
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
          <Download className="w-3 h-3" /> Official MetaTrader 5 apps — they work with your {BROKER} account.
          In the app, search for the server <span className="font-semibold text-ink">{MT5_SERVER}</span> and log in.
        </p>
      </div>

      <p className="text-[10px] text-ink3 text-center">
        MetaTrader 5 © MetaQuotes Ltd. Trading involves risk — trade responsibly.
      </p>
    </div>
  )
}
