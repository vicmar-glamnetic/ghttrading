'use client'
import { useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'

// Instrument presets: pip size (price move that equals 1 pip) and pip value
// per 1.0 standard lot in USD. Both are editable because they vary by broker.
const PRESETS: Record<string, { label: string; pipSize: number; pipValue: number }> = {
  xauusd: { label: 'Gold (XAUUSD)', pipSize: 0.1, pipValue: 10 },
  fx:     { label: 'FX Majors (EURUSD, GBPUSD…)', pipSize: 0.0001, pipValue: 10 },
  jpy:    { label: 'FX JPY pairs (USDJPY…)', pipSize: 0.01, pipValue: 9.1 },
  custom: { label: 'Custom', pipSize: 0.0001, pipValue: 10 },
}

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export default function CalculatorPage() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('xauusd')
  const [balance, setBalance] = useState('1000')
  const [risk, setRisk] = useState('1')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [pipSize, setPipSize] = useState(String(PRESETS.xauusd.pipSize))
  const [pipValue, setPipValue] = useState(String(PRESETS.xauusd.pipValue))

  function applyPreset(key: keyof typeof PRESETS) {
    setPreset(key)
    if (key !== 'custom') {
      setPipSize(String(PRESETS[key].pipSize))
      setPipValue(String(PRESETS[key].pipValue))
    }
  }

  const r = useMemo(() => {
    const bal = parseFloat(balance)
    const riskPct = parseFloat(risk)
    const e = parseFloat(entry)
    const s = parseFloat(sl)
    const t = parseFloat(tp)
    const ps = parseFloat(pipSize)
    const pv = parseFloat(pipValue)

    const riskAmount = bal > 0 && riskPct > 0 ? bal * (riskPct / 100) : NaN
    const stopDist = Number.isFinite(e) && Number.isFinite(s) ? Math.abs(e - s) : NaN
    const stopPips = Number.isFinite(stopDist) && ps > 0 ? stopDist / ps : NaN
    const lots = Number.isFinite(riskAmount) && Number.isFinite(stopPips) && stopPips > 0 && pv > 0
      ? riskAmount / (stopPips * pv) : NaN

    const rewardDist = Number.isFinite(e) && Number.isFinite(t) ? Math.abs(t - e) : NaN
    const rewardPips = Number.isFinite(rewardDist) && ps > 0 ? rewardDist / ps : NaN
    const reward = Number.isFinite(rewardPips) && Number.isFinite(lots) ? rewardPips * pv * lots : NaN
    const rr = Number.isFinite(rewardPips) && Number.isFinite(stopPips) && stopPips > 0 ? rewardPips / stopPips : NaN

    return { riskAmount, stopPips, lots, rewardPips, reward, rr }
  }, [balance, risk, entry, sl, tp, pipSize, pipValue])

  const inputCls = 'w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink transition-colors'
  const labelCls = 'text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Position Size Calculator</h1>
      </div>

      <div className="bg-surface rounded-xl border border-line p-4 sm:p-6 space-y-4">
        {/* Instrument */}
        <div>
          <label className={labelCls}>Instrument</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => applyPreset(key as keyof typeof PRESETS)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  preset === key ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'text-ink3 border-line hover:bg-elevated'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Account balance ($)</label>
            <input type="number" inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Risk per trade (%)</label>
            <input type="number" inputMode="decimal" value={risk} onChange={e => setRisk(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Entry price</label>
            <input type="number" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} placeholder="e.g. 2350.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Stop loss</label>
            <input type="number" inputMode="decimal" value={sl} onChange={e => setSl(e.target.value)} placeholder="e.g. 2345.00" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Take profit <span className="text-ink3 normal-case font-normal">(optional — for R:R)</span></label>
            <input type="number" inputMode="decimal" value={tp} onChange={e => setTp(e.target.value)} placeholder="e.g. 2360.00" className={inputCls} />
          </div>
        </div>

        {/* Pip config (editable) */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
          <div>
            <label className={labelCls}>Pip size</label>
            <input type="number" inputMode="decimal" value={pipSize} onChange={e => { setPipSize(e.target.value); setPreset('custom') }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pip value / lot ($)</label>
            <input type="number" inputMode="decimal" value={pipValue} onChange={e => { setPipValue(e.target.value); setPreset('custom') }} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Risk amount" value={Number.isFinite(r.riskAmount) ? `$${fmt(r.riskAmount)}` : '—'} />
        <Stat label="Stop distance" value={Number.isFinite(r.stopPips) ? `${fmt(r.stopPips, 1)} pips` : '—'} />
        <Stat label="Position size" value={Number.isFinite(r.lots) ? `${fmt(r.lots)} lots` : '—'} highlight />
        <Stat label="Reward (at TP)" value={Number.isFinite(r.reward) ? `$${fmt(r.reward)}` : '—'} />
        <Stat label="Reward pips" value={Number.isFinite(r.rewardPips) ? `${fmt(r.rewardPips, 1)}` : '—'} />
        <Stat label="Risk : Reward" value={Number.isFinite(r.rr) ? `1 : ${fmt(r.rr, 2)}` : '—'} />
      </div>

      <div className="flex gap-2 text-xs text-ink3 bg-surface border border-line rounded-xl p-3">
        <Info className="w-4 h-4 shrink-0 text-yellow-500/70 mt-0.5" />
        <p>
          Pip size and pip value per lot vary by broker and account currency. Presets are common defaults — always
          confirm your instrument&rsquo;s contract specs in MT5. This tool is for guidance only, not financial advice.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-line bg-surface'}`}>
      <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-bold tabular-nums ${highlight ? 'text-yellow-500 text-lg' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
