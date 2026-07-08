import { Apple, Smartphone, Share, Plus, MoreVertical, Download, Check } from 'lucide-react'

export const metadata = { title: 'Install App · GHT Trading' }

const iosSteps = [
  { icon: Share, text: 'Open community.ghttrading.co in Safari (not Chrome or an in-app browser).' },
  { icon: Share, text: 'Tap the Share button (the square with an ↑ arrow) at the bottom of Safari.' },
  { icon: Plus, text: 'Scroll down and tap "Add to Home Screen".' },
  { icon: Check, text: 'Tap "Add" — the GHT icon appears on your home screen.' },
]

const androidSteps = [
  { icon: MoreVertical, text: 'Open community.ghttrading.co in Chrome.' },
  { icon: MoreVertical, text: 'Tap the ⋮ menu (three dots) at the top-right.' },
  { icon: Download, text: 'Tap "Install app" (or "Add to Home screen").' },
  { icon: Check, text: 'Confirm — the GHT icon appears on your home screen.' },
]

function StepList({ steps }: { steps: { icon: React.ElementType; text: string }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold grid place-items-center">{i + 1}</span>
          <span className="text-sm text-ink leading-relaxed">{s.text}</span>
        </li>
      ))}
    </ol>
  )
}

export default function InstallPage() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
          <Smartphone className="w-7 h-7 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-black text-ink">Install the App</h1>
        <p className="text-ink2 text-sm mt-1">
          Add GHT Community to your home screen for a full-screen, app-like experience — no app store needed.
        </p>
      </div>

      {/* iOS */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Apple className="w-5 h-5 text-ink" />
          <h2 className="font-bold text-ink">iPhone &amp; iPad (Safari)</h2>
        </div>
        <StepList steps={iosSteps} />
        <p className="text-[11px] text-ink3 mt-4">
          Tip: if you don&apos;t see &quot;Add to Home Screen&quot;, make sure you opened the site in <span className="text-ink2 font-semibold">Safari</span> — not the in-app browser inside Messenger/Facebook (tap &quot;Open in Safari&quot; first).
        </p>
      </div>

      {/* Android */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-ink" />
          <h2 className="font-bold text-ink">Android (Chrome)</h2>
        </div>
        <StepList steps={androidSteps} />
        <p className="text-[11px] text-ink3 mt-4">
          Tip: if there&apos;s no &quot;Install app&quot; prompt, use the <span className="text-ink2 font-semibold">⋮ menu → Add to Home screen</span>.
        </p>
      </div>

      <p className="text-[11px] text-ink3 text-center">
        Once installed, open it like any app and log in once — it stays signed in.
      </p>
    </div>
  )
}
