// Starter templates and reflection prompts for the journal.
//
// The blank page is the biggest reason a first entry never gets written, so
// every "start journaling" surface in the app (empty state, mobile quick-add,
// the welcome tour, a closed signal) funnels into the composer pre-filled from
// one of these. A half-written entry is far easier to finish than a blank one.
//
// Templates are applied by key via the `?compose=<key>` query param the journal
// page reads on mount — see app/(main)/journal/page.tsx.

export interface JournalTemplate {
  key: string
  /** Short label for the button/card. */
  label: string
  /** One-line hint under the label in the empty state. */
  hint: string
  /** Lucide icon name is chosen at the call site; templates stay data-only. */
  title?: string
  content?: string
  mood?: string
  result?: string
  direction?: string
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    key: 'win',
    label: 'Log a win',
    hint: 'Bank what worked so you can repeat it',
    title: 'Winning trade',
    result: 'win',
    mood: 'satisfied',
    content: [
      'What was the setup?',
      '',
      'Why did I take it (my edge)?',
      '',
      'Did I follow my plan, or did it just work out?',
      '',
      'One thing to repeat next time:',
    ].join('\n'),
  },
  {
    key: 'loss',
    label: 'Log a loss',
    hint: 'The most valuable page you can write',
    title: 'Losing trade',
    result: 'loss',
    mood: 'analyzing',
    content: [
      'What happened?',
      '',
      'Was it a bad trade, or a good trade with a bad outcome?',
      '',
      'Did I break a rule (size, stop, chasing, revenge)?',
      '',
      'One thing to fix next time:',
    ].join('\n'),
  },
  {
    key: 'plan',
    label: 'Pre-market plan',
    hint: 'Decide before the candles move you',
    title: 'Pre-market plan',
    content: [
      'Bias for today (bullish / bearish / neutral):',
      '',
      'Levels I care about:',
      '',
      'Setups I will take:',
      '',
      'What would make me stay flat:',
    ].join('\n'),
  },
  {
    key: 'lesson',
    label: 'Lesson learned',
    hint: 'Turn a mistake into a rule',
    title: 'Lesson learned',
    mood: 'analyzing',
    content: [
      'What did I learn today?',
      '',
      'What triggered it?',
      '',
      'The rule I am adding to my playbook:',
    ].join('\n'),
  },
]

const BY_KEY = new Map(JOURNAL_TEMPLATES.map(t => [t.key, t]))

export function getTemplate(key: string | null | undefined): JournalTemplate | null {
  if (!key) return null
  return BY_KEY.get(key) ?? null
}

// Daily reflection prompts. One is surfaced per day (picked from the date so it
// is stable within a day and rotates predictably) as a low-friction nudge —
// tapping it opens the composer scaffolded with the prompt, so "what do I even
// write?" is already answered.
export const REFLECTION_PROMPTS: { title: string; content: string }[] = [
  { title: 'Did you follow your plan today?', content: 'Did I follow my plan today? Where did I stick to it, and where did I drift?' },
  { title: 'Your best setup this week', content: 'Which setup has been working best for me this week, and why?' },
  { title: 'Best trade of the week', content: 'What was my best trade this week? What did I do right that I want to repeat?' },
  { title: 'A rule you broke', content: 'Did I break any of my rules recently? What did it cost me?' },
  { title: 'How did you feel while trading?', content: 'How did I feel while trading today — calm, rushed, fearful, greedy? How did it affect my decisions?' },
  { title: 'What are you avoiding?', content: 'Is there a mistake I keep making that I have been avoiding writing down?' },
  { title: 'Grade your discipline', content: 'On a scale of 1-10, how disciplined was I this week? What would push it one point higher?' },
]

/** The prompt for a given day — stable within the day, rotates day to day. */
export function promptForDay(date = new Date()): { title: string; content: string } {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000,
  )
  return REFLECTION_PROMPTS[dayOfYear % REFLECTION_PROMPTS.length]
}

/**
 * Current journaling streak in days: consecutive calendar days ending today (or
 * yesterday, so the streak survives until the day is over) that have at least
 * one entry. `dates` are entry timestamps (ISO strings or Date).
 */
export function journalingStreak(dates: (string | Date)[], now = new Date()): number {
  if (dates.length === 0) return 0
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const days = new Set(dates.map(d => dayKey(new Date(d))))

  // Anchor: if there's nothing today, allow the streak to still be "alive" from
  // yesterday — today just isn't over yet.
  const cursor = new Date(now)
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
