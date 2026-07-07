// Trading — embeds the MetaTrader 5 Web Terminal so members can trade with
// their own MT5 account (version=5 = MetaTrader 5).
//
// Pinned to AC Capital Market's MT5 server so the login box defaults to it.
// To change broker, update MT5_SERVER to the exact server name from MT5
// (File → Login to Trade Account → Server).
// Load the MT5 web terminal host directly (trade.mql5.com 301-redirects here and
// that redirect carries X-Frame-Options, which breaks embedding). version=5 = MT5.
const MT5_SERVER = 'MT5-ACCapitalMarket(S)-Real'
const MT5_TERMINAL_URL =
  `https://metatraderweb.app/trade?servers=${encodeURIComponent(MT5_SERVER)}` +
  `&trade_server=${encodeURIComponent(MT5_SERVER)}` +
  `&startup_mode=connect_account&lang=en&save_password=on&version=5`

export const metadata = { title: 'Trading · GHT Trading' }

export default function TradingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide">
          Trading
        </h1>
        <p className="text-ink2 text-sm mt-2 max-w-xl mx-auto">
          Trade directly from GHT Trading. Log in with your own MetaTrader 5 account and server below.
        </p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-line shadow-lg">
        <iframe
          src={MT5_TERMINAL_URL}
          title="MetaTrader 5 Web Terminal"
          className="w-full h-[calc(100vh-14rem)] min-h-[560px] border-0"
          allow="clipboard-write; fullscreen"
        />
      </div>

      <p className="text-[10px] text-ink3 text-center">
        MetaTrader 5 Web Terminal © MetaQuotes Ltd. Trading involves risk — trade responsibly.
      </p>
    </div>
  )
}
