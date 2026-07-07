// GHT Terminal — embeds the MetaTrader 5 Web Terminal so members can trade
// directly with their own MT5 account + broker server.
//
// The web terminal lets the user pick/search their broker server in the
// "Connect to account" dialog. To pin a specific broker, append e.g.
// `&servers=YourBroker-Live&trade_server=YourBroker-Live` to MT5_TERMINAL_URL.
const MT5_TERMINAL_URL =
  'https://trade.mql5.com/trade?startup_mode=connect_account&lang=en&save_password=on&version=5'

export const metadata = { title: 'Terminal · GHT Trading' }

export default function TerminalPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-wide flex items-center justify-center gap-3">
          <span className="text-yellow-500/60">‹‹‹</span>
          GHT Terminal
          <span className="text-yellow-500/60">›››</span>
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
