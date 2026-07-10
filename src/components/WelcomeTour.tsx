'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Rocket, Zap, Gauge, ThumbsUp, BarChart3, Bell, MessageCircle, BookOpen, NotebookPen,
  CalendarDays, Calculator, BellRing, Trophy, Clock, Smartphone, TrendingUp, Check, X,
  GraduationCap,
} from 'lucide-react'

import { ACCM_REGISTER_URL } from '@/lib/billing'

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
    title: 'Welcome to Gold Heist Trading 🥇',
    body: 'Here\'s a full tour of everything the app can do — signals, live tools, community, and more. Tap Next to explore, or skip anytime.',
  },
  {
    icon: Zap,
    title: 'Signals',
    body: 'Live gold trade ideas from our coaches — with entry, multiple take-profits, and a stop-loss. Tap the copy icon next to any level to paste it straight into your MT5 order.',
    href: '/ideas',
    cta: 'Open Signals',
  },
  {
    icon: Gauge,
    title: 'Live signal status',
    body: 'Every open gold signal shows where the price is right now: 🟢 Entry valid · 🟡 Price in zone · 🔴 Missed (running) · ✅ TP hit. So you instantly know if you can still get in — and signals auto-close when they hit target.',
    href: '/ideas',
    cta: 'See it live',
  },
  {
    icon: Calculator,
    title: 'Your exact lot size',
    body: 'Set your account balance + risk % once (the bar at the top of Signals) and every signal shows YOUR lot size — e.g. "0.13 lots" — calculated from its entry and stop. It follows you across devices.',
    href: '/ideas',
    cta: 'Set your account',
  },
  {
    icon: ThumbsUp,
    title: 'Community sentiment',
    body: 'Tap "Taking 👍" or "Skipping 👎" on any signal to see what the community is doing — e.g. "72% taking". A quick read on the crowd.',
    href: '/ideas',
    cta: 'Open Signals',
  },
  {
    icon: BarChart3,
    title: 'Results',
    body: 'Our real track record — win rate, average risk:reward, pips banked (this week / month / all-time), a monthly breakdown, and a coach leaderboard. Full transparency.',
    href: '/ideas',
    cta: 'View Results',
  },
  {
    icon: BellRing,
    title: 'Push alerts',
    body: 'Get a notification the moment a new signal drops, when one hits TP 🎯, and when a coach goes live 🔴 — even with the app closed. Turn it on in Settings → Alerts.',
    href: '/settings',
    cta: 'Enable alerts',
  },
  {
    icon: MessageCircle,
    title: 'Community & Coaches',
    body: 'Chat in the main community room, join a dedicated room for each coach, or message a coach 1-on-1 for personal guidance.',
    href: '/chat',
    cta: 'Open Chat',
  },
  {
    icon: GraduationCap,
    title: 'Courses',
    body: 'Structured video courses that track your progress — Trading Basics takes you from pips to your first MT5 order, and Gold Trading covers what actually moves XAUUSD. Pick up wherever you left off.',
    href: '/courses',
    cta: 'Browse courses',
  },
  {
    icon: BookOpen,
    title: 'Education',
    body: 'Video lessons and posts for every level — getting started, technical analysis, strategy, risk management, and psychology. Browse by category.',
    href: '/education',
    cta: 'Start learning',
  },
  {
    icon: NotebookPen,
    title: 'Journal & Analytics',
    body: 'Log every trade with your result and P&L. The Analytics tab then shows your win rate, avg win/loss, profit factor, an equity curve, and a breakdown by pair and by day.',
    href: '/journal',
    cta: 'Open Journal',
  },
  {
    icon: CalendarDays,
    title: 'P&L Calendar',
    body: 'Your journaled profit/loss laid out day by day, so you can see your green and red days at a glance and spot patterns.',
    href: '/calendar',
    cta: 'Open Calendar',
  },
  {
    icon: Calculator,
    title: 'Position Calculator',
    body: 'A standalone tool: enter balance, risk %, entry and stop → get your exact lot size, pip value, and risk:reward. Presets for gold, FX majors, and JPY pairs.',
    href: '/calculator',
    cta: 'Try the calculator',
  },
  {
    icon: Bell,
    title: 'Gold price alerts',
    body: 'On the Trading View chart, set "ping me when gold hits 4100" and get a push the moment it crosses. Great for catching your levels without staring at the screen.',
    href: '/chart',
    cta: 'Set a price alert',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    body: 'See how members rank by their journaled P&L and win rate. Opt in with "Share my stats" in Settings to join the board — friendly competition and motivation.',
    href: '/leaderboard',
    cta: 'View leaderboard',
  },
  {
    icon: Clock,
    title: 'Sessions & Economic Calendar',
    body: 'The right sidebar shows live market sessions (London/NY/Tokyo) and flags the peak gold-volatility overlap. The Economic Calendar lists NFP, CPI, and FOMC — the events that move gold.',
    href: '/events',
    cta: 'Open Econ Calendar',
  },
  {
    icon: Smartphone,
    title: 'Install as an app',
    body: 'Add Gold Heist Trading to your phone\'s home screen for a full-screen, app-like experience — and it\'s required on iPhone to receive push alerts.',
    href: '/install',
    cta: 'How to install',
  },
]

// Shown only to members who didn't register under ACCM.
const START_TRADING: Step = {
  icon: TrendingUp,
  title: 'Start Trading',
  body: 'To take the signals for real and unlock full perks, open a funded account with our partner broker ACCM — registering under our team also gives you free community access.',
  href: ACCM_REGISTER_URL,
  cta: 'Open ACCM account',
}

export function WelcomeTour() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  // Non-ACCM members get an extra "Start Trading" step at the end.
  const isAccm = (session?.user as { accmMember?: boolean } | undefined)?.accmMember !== false
  const steps = useMemo(() => (isAccm ? STEPS : [...STEPS, START_TRADING]), [isAccm])

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
  const idx = Math.min(i, steps.length - 1)
  const step = steps[idx]
  const Icon = step.icon
  const last = idx === steps.length - 1

  function goTo(href: string) {
    close()
    if (/^https?:\/\//.test(href)) window.open(href, '_blank', 'noopener')
    else router.push(href)
  }

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
            {steps.map((_, d) => (
              <span key={d} className={`h-1.5 rounded-full transition-all ${d === idx ? 'w-5 bg-yellow-500' : 'w-1.5 bg-line2'}`} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <button onClick={close} className="text-xs font-semibold text-ink3 hover:text-ink2 px-2 py-2">
            {last ? '' : 'Skip'}
          </button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={() => setI(idx - 1)} className="text-sm font-semibold text-ink2 hover:text-ink border border-line rounded-lg px-4 py-2 transition-colors">
                Back
              </button>
            )}
            {last ? (
              <button onClick={close} className="inline-flex items-center gap-1.5 text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-4 py-2 transition-colors">
                <Check className="w-4 h-4" /> Get started
              </button>
            ) : (
              <button onClick={() => setI(idx + 1)} className="text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-5 py-2 transition-colors">
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
