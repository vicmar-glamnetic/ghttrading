import { Monitor, Smartphone, Download, Apple } from 'lucide-react'
import { CopyField } from './CopyField'
import { ACCM_REGISTER_URL } from '@/lib/billing'

export const metadata = { title: 'Trading · Gold Heist Trading' }

// AC Capital Market MT5 server (from your account approval email).
const MT5_SERVER = 'MT5-ACCapitalMarket(S)-Real'
const BROKER = 'AC Capital Market'

// Official MetaTrader 5 downloads (work with any broker/server).
const DOWNLOADS = [
  { label: 'Windows', icon: Monitor,    href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { label: 'macOS',   icon: Apple,      href: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg' },
  { label: 'Android', icon: Smartphone, href: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5' },
  { label: 'iOS',     icon: Apple,      href: 'https://apps.apple.com/app/metatrader-5/id413251709' },
]

export default function TradingPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">Trading</h1>
        <p className="text-ink2 text-sm mt-2">
          Trade with your {BROKER} MetaTrader 5 account. Download the app, then log in with the details below.
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
          <Download className="w-3 h-3" /> Official MetaTrader 5 apps — they work with your {BROKER} account.
        </p>
      </div>

      {/* Login details */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">2 · Log in to your account</p>
        <CopyField label="Server" value={MT5_SERVER} />
        <p className="text-xs text-ink2">
          Use the <span className="font-semibold text-ink">Login</span> (account number) and{' '}
          <span className="font-semibold text-ink">password</span> from your {BROKER} approval email.
          Don&apos;t have an account yet?{' '}
          <a href={ACCM_REGISTER_URL} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400">Open one with {BROKER}</a>.
        </p>
      </div>

      {/* Steps */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-3">3 · Connect &amp; trade</p>
        <ol className="space-y-2.5 text-sm text-ink">
          {[
            'Install and open MetaTrader 5.',
            'Go to File → Login to Trade Account (desktop) or Settings → New Account (mobile).',
            `Search for the server "${MT5_SERVER}" and select it.`,
            'Enter your login (account number) and password, then connect.',
            'Your charts, symbols and orders load — trade directly.',
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-elevated text-ink2 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[10px] text-ink3 text-center">
        MetaTrader 5 © MetaQuotes Ltd. Trading involves risk — trade responsibly.
      </p>
    </div>
  )
}
