'use client'
import { useId, useMemo, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

/**
 * Gold's pip convention is the one members get wrong most often. Here 1 pip is a
 * $0.01 move in price, which puts a standard lot (100 oz) at $1 per pip. Plenty
 * of brokers quote gold on a 10 oz contract instead, where the same pip is worth
 * $0.10 — hence the override rather than a hardcoded constant.
 */
const DEFAULT_PIP_VALUE_PER_LOT = 1

/** A micro lot is 0.01 of a standard lot, so the count is the standard size × 100. */
const MICRO_LOTS_PER_STANDARD = 100

/** Above this, say something. Members set 10% on a demo and forget to move it back. */
const HIGH_RISK_PERCENT = 5

const RISK_MIN = 0.5
const RISK_MAX = 20
const RISK_STEP = 0.5

/**
 * Keystrokes, not numbers: inputs stay as strings so a member can clear a field
 * mid-edit. Negatives never make it into state — the minus key is simply dropped
 * rather than producing a value we then have to reject downstream.
 */
function sanitize(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  return rest.length ? `${whole}.${rest.join('')}` : whole
}

function money(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export interface GoldLotCalculatorProps {
  /** Starting account balance in USD. */
  defaultBalance?: number
  /** Starting risk per trade, in percent. Clamped to the slider's 0.5–20 range. */
  defaultRiskPercent?: number
  /** Starting stop distance, in pips (1 pip = $0.01 of price). */
  defaultStopLossPips?: number
  /** Starting pip value per 1.0 standard lot, in USD. */
  defaultPipValuePerLot?: number
  className?: string
}

/**
 * XAUUSD position sizer: balance + risk % + stop distance → the lot size that
 * makes the stop cost exactly what the member said they were willing to lose.
 */
export function GoldLotCalculator({
  defaultBalance = 1000,
  defaultRiskPercent = 2,
  defaultStopLossPips = 300,
  defaultPipValuePerLot = DEFAULT_PIP_VALUE_PER_LOT,
  className = '',
}: GoldLotCalculatorProps) {
  const id = useId()
  const [balance, setBalance] = useState(() => String(Math.max(0, defaultBalance)))
  const [riskPercent, setRiskPercent] = useState(() =>
    Math.min(RISK_MAX, Math.max(RISK_MIN, defaultRiskPercent)),
  )
  const [stopLossPips, setStopLossPips] = useState(() => String(Math.max(0, defaultStopLossPips)))
  const [pipValue, setPipValue] = useState(() => String(Math.max(0, defaultPipValuePerLot)))
  const [showAdvanced, setShowAdvanced] = useState(
    () => defaultPipValuePerLot !== DEFAULT_PIP_VALUE_PER_LOT,
  )

  const result = useMemo(() => {
    const bal = parseFloat(balance)
    const pips = parseFloat(stopLossPips)
    const pv = parseFloat(pipValue)

    const riskAmount = Number.isFinite(bal) && bal > 0 ? bal * (riskPercent / 100) : null
    // A zero stop or a zero pip value is the divide-by-zero — both are held back
    // here rather than allowed to produce Infinity in the cards.
    const sizable = riskAmount !== null && Number.isFinite(pips) && pips > 0 && Number.isFinite(pv) && pv > 0
    const lotsStandard = sizable ? riskAmount / (pips * pv) : null

    return {
      riskAmount,
      lotsStandard,
      lotsMicro: lotsStandard === null ? null : lotsStandard * MICRO_LOTS_PER_STANDARD,
      stopIsZero: stopLossPips.trim() !== '' && (!Number.isFinite(pips) || pips <= 0),
      pipValueIsZero: pipValue.trim() !== '' && (!Number.isFinite(pv) || pv <= 0),
    }
  }, [balance, riskPercent, stopLossPips, pipValue])

  const inputCls = 'w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink transition-colors'
  const labelCls = 'text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5'

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-surface rounded-xl border border-line p-4 sm:p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${id}-balance`} className={labelCls}>Account balance ($)</label>
            <input
              id={`${id}-balance`}
              type="text"
              inputMode="decimal"
              value={balance}
              onChange={e => setBalance(sanitize(e.target.value))}
              placeholder="1000"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor={`${id}-stop`} className={labelCls}>
              Stop loss <span className="text-ink3 normal-case font-normal">(pips)</span>
            </label>
            <input
              id={`${id}-stop`}
              type="text"
              inputMode="decimal"
              value={stopLossPips}
              onChange={e => setStopLossPips(sanitize(e.target.value))}
              placeholder="300"
              aria-invalid={result.stopIsZero}
              className={`${inputCls} ${result.stopIsZero ? '!border-red-400/50' : ''}`}
            />
            {result.stopIsZero && (
              <p className="text-xs text-red-400 mt-1.5">Stop loss must be greater than 0 pips.</p>
            )}
          </div>
        </div>

        {/* Risk slider */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor={`${id}-risk`} className={labelCls.replace('mb-1.5', '')}>Risk per trade</label>
            <span className="text-sm font-bold tabular-nums text-yellow-500">{fmt(riskPercent, 1)}%</span>
          </div>
          <input
            id={`${id}-risk`}
            type="range"
            min={RISK_MIN}
            max={RISK_MAX}
            step={RISK_STEP}
            value={riskPercent}
            onChange={e => setRiskPercent(parseFloat(e.target.value))}
            className="w-full accent-yellow-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-ink3 tabular-nums mt-1">
            <span>{RISK_MIN}%</span>
            <span>{RISK_MAX}%</span>
          </div>
          {riskPercent > HIGH_RISK_PERCENT && (
            <p className="flex items-start gap-1.5 text-xs text-amber-400 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                {fmt(riskPercent, 1)}% per trade is high risk — a short losing streak takes a serious
                bite out of this account.
              </span>
            </p>
          )}
        </div>

        {/* Advanced: pip value override */}
        <div className="pt-1 border-t border-line">
          {showAdvanced ? (
            <div className="pt-3">
              <label htmlFor={`${id}-pipvalue`} className={labelCls}>
                Pip value per standard lot ($)
              </label>
              <input
                id={`${id}-pipvalue`}
                type="text"
                inputMode="decimal"
                value={pipValue}
                onChange={e => setPipValue(sanitize(e.target.value))}
                placeholder={String(DEFAULT_PIP_VALUE_PER_LOT)}
                aria-invalid={result.pipValueIsZero}
                className={`${inputCls} sm:max-w-[50%] ${result.pipValueIsZero ? '!border-red-400/50' : ''}`}
              />
              {result.pipValueIsZero ? (
                <p className="text-xs text-red-400 mt-1.5">Pip value must be greater than 0.</p>
              ) : (
                <p className="text-xs text-ink3 mt-1.5">
                  Default ${DEFAULT_PIP_VALUE_PER_LOT} assumes a 100 oz contract. On a 10 oz contract
                  it&rsquo;s $0.10.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="pt-3 text-xs font-semibold text-ink3 hover:text-yellow-500 transition-colors"
            >
              Override pip value
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Risk amount" value={result.riskAmount === null ? '—' : money(result.riskAmount)} />
        <Stat
          label="Standard lots"
          value={result.lotsStandard === null ? '—' : fmt(result.lotsStandard, 2)}
          highlight
        />
        <Stat
          label="Micro lots"
          value={result.lotsMicro === null ? '—' : Math.round(result.lotsMicro).toLocaleString('en-US')}
        />
      </div>

      <div className="flex gap-2 text-xs text-ink3 bg-surface border border-line rounded-xl p-3">
        <Info className="w-4 h-4 shrink-0 text-yellow-500/70 mt-0.5" />
        <p>
          Assumes 1 pip = a $0.01 move in XAUUSD and ${DEFAULT_PIP_VALUE_PER_LOT} per pip on a 1.0
          standard lot (100 oz). Contract size and pip value vary by broker — confirm your
          instrument&rsquo;s specs before sizing a live trade. Guidance only, not financial advice.
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
