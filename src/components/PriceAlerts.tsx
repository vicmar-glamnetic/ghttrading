'use client'
import { useEffect, useState, useCallback } from 'react'
import { Bell, Plus, X, Check } from 'lucide-react'

interface Alert { id: string; symbol: string; targetPrice: number; direction: 'above' | 'below'; triggered: boolean }

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => { if (Array.isArray(d)) setAlerts(d) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/price?symbol=XAUUSD').then(r => r.json()).then(d => { if (typeof d.price === 'number') setPrice(d.price) }).catch(() => {})
  }, [])

  async function add() {
    const t = Number(target)
    if (!(t > 0) || price == null) return
    setBusy(true)
    try {
      const direction = t >= price ? 'above' : 'below'
      const res = await fetch('/api/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'XAUUSD', targetPrice: t, direction }),
      })
      if (res.ok) { setTarget(''); load() }
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    setAlerts(a => a.filter(x => x.id !== id))
    await fetch('/api/alerts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <Bell className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-ink">Gold Price Alerts</span>
        {price != null && <span className="ml-auto text-xs text-ink3 tabular-nums">XAUUSD {price}</span>}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)}
            placeholder={price ? `e.g. ${Math.round(price)}` : 'Target price'}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="flex-1 bg-sunken border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40"
          />
          <button onClick={add} disabled={busy || !target || price == null}
            className="inline-flex items-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-lg px-3 py-2 transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {target && price != null && Number(target) > 0 && (
          <p className="text-[11px] text-ink3">Notify me when gold goes <b className="text-ink2">{Number(target) >= price ? 'above' : 'below'} {Number(target)}</b> — you&rsquo;ll get a push.</p>
        )}

        {alerts.length === 0 ? (
          <p className="text-xs text-ink3 text-center py-2">No alerts yet. Set a level to get pinged.</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map(a => (
              <div key={a.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${a.triggered ? 'border-line bg-sunken opacity-70' : 'border-line'}`}>
                {a.triggered
                  ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  : <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />}
                <span className="text-sm text-ink tabular-nums">{a.symbol} {a.direction} <b>{a.targetPrice}</b></span>
                {a.triggered && <span className="text-[10px] text-green-400">triggered</span>}
                <button onClick={() => remove(a.id)} className="ml-auto text-ink3 hover:text-red-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-ink3">Enable push in Settings → Alerts to receive these. Gold (XAUUSD) only for now.</p>
      </div>
    </div>
  )
}
