'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Rocket, Zap, BarChart3, Bell, MessageCircle, BookOpen, NotebookPen, Calculator, Check, X,
} from 'lucide-react'

const SEEN_KEY = 'ght:tourSeen'

interface Step {
  icon: typeof Zap
  title: string
  body: string
  href?: string
  cta?: string
}

const STEPS: Step[] = [
  {
    icon: Rocket,
    title: 'Welcome to GHT Trading 🥇',
    body: 'A quick 60-second tour of what you can do here. Tap Next to explore, or skip anytime.',
  },
  {
    icon: Zap,
    title: 'Signals',
    body: 'Live gold trade ideas from our coaches — entry, take-profit, and stop-loss. Copy them straight to MT5 in one tap.',
    href: '/ideas',
    cta: 'Open Signals',
  },
  {
    icon: BarChart3,
    title: 'Results',
    body: 'See our real track record — win rate, average risk:reward, monthly breakdown, and a coach leaderboard. Full transparency.',
    href: '/ideas',
    cta: 'View Results',
  },
  {
    icon: Bell,
    title: 'Signal Alerts',
    body: 'Get a push notification the moment a new signal drops — even with the app closed. Turn it on in Settings → Alerts.',
    href: '/settings',
    cta: 'Enable alerts',
  },
  {
    icon: MessageCircle,
    title: 'Community & Coaches',
    body: 'Chat in the community room, join a room for each coach, or message a coach 1-on-1 for guidance.',
    href: '/chat',
    cta: 'Open Chat',
  },
  {
    icon: BookOpen,
    title: 'Education',
    body: 'Video lessons and tutorials for every level — from getting started to advanced strategy and risk management.',
    href: '/education',
    cta: 'Start learning',
  },
  {
    icon: NotebookPen,
    title: 'Journal & Calendar',
    body: 'Log your trades and notes, then track your profit/loss day by day to see your progress over time.',
    href: '/journal',
    cta: 'Open Journal',
  },
  {
    icon: Calculator,
    title: 'Position Calculator',
    body: 'Enter your balance, risk %, entry and stop — get your exact lot size and risk:reward instantly. No more guessing.',
    href: '/calculator',
    cta: 'Try the calculator',
  },
]

export function WelcomeTour() {
  const router = useRouter()
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  // Auto-open once for new members; reopen on demand via the 'ght:open-tour' event.
  useEffect(() => {
    if (status === 'authenticated' && !localStorage.getItem(SEEN_KEY)) { setI(0); setOpen(true) }
    const openTour = () => { setI(0); setOpen(true) }
    window.addEventListener('ght:open-tour', openTour)
    return () => window.removeEventListener('ght:open-tour', openTour)
  }, [status])

  const close = useCallback(() => {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }, [])

  if (!open) return null
  const step = STEPS[i]
  const Icon = step.icon
  const last = i === STEPS.length - 1

  function goTo(href: string) { close(); router.push(href) }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={close}>
      <div
        className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-yellow-500/15 to-yellow-600/5 px-6 pt-8 pb-6 text-center">
          <button onClick={close} aria-label="Close tour" className="absolute top-3 right-3 p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-elevated">
            <X className="w-5 h-5" />
          </button>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 grid place-items-center mb-3">
            <Icon className="w-7 h-7 text-yellow-500" />
          </div>
          <h2 className="text-lg font-black text-ink">{step.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-ink2 leading-relaxed text-center">{step.body}</p>

          {step.href && step.cta && (
            <button
              onClick={() => goTo(step.href!)}
              className="mt-4 w-full text-sm font-bold bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 rounded-lg py-2.5 transition-colors"
            >
              {step.cta} →
            </button>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {STEPS.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-yellow-500' : 'w-1.5 bg-line2'}`} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <button onClick={close} className="text-xs font-semibold text-ink3 hover:text-ink2 px-2 py-2">
            {last ? '' : 'Skip'}
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="text-sm font-semibold text-ink2 hover:text-ink border border-line rounded-lg px-4 py-2 transition-colors">
                Back
              </button>
            )}
            {last ? (
              <button onClick={close} className="inline-flex items-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-4 py-2 transition-colors">
                <Check className="w-4 h-4" /> Get started
              </button>
            ) : (
              <button onClick={() => setI(i + 1)} className="text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-5 py-2 transition-colors">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper for any "Take a tour" button to trigger the tour.
export function openTour() {
  window.dispatchEvent(new Event('ght:open-tour'))
}
