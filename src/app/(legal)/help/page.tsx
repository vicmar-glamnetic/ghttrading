import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Help & FAQ' }

export default function HelpPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl sm:text-3xl font-black text-ink">Help &amp; FAQ</h1>
      <p className="text-sm text-ink2 leading-relaxed pt-1">
        Answers to the most common questions about the GHT Trading Community. Still stuck? Message a coach in{' '}
        <Link href="/chat" className="text-yellow-500 hover:underline">Chat</Link> or email{' '}
        <a href="mailto:support@ghttrading.co" className="text-yellow-500 hover:underline">support@ghttrading.co</a>.
      </p>

      <Section title="Getting started">
        <QA q="How do I create an account?">
          Tap <strong className="text-ink">Register</strong>, enter your name, email, and password, then confirm the code
          we email you. New accounts may need a quick manual approval before full access — you&rsquo;ll be let in as soon
          as a coach approves you.
        </QA>
        <QA q="I didn't get my verification email.">
          Check your spam/junk folder and make sure the email address is correct. You can request a new code from the
          verification screen. Codes expire after a short time.
        </QA>
        <QA q="How do I reset my password?">
          On the login screen tap <strong className="text-ink">Forgot password</strong> and follow the link we email you.
        </QA>
      </Section>

      <Section title="Features">
        <QA q="What are Signals?">
          Signals are trade ideas posted by our coaches (entry, take-profit, and stop-loss levels). They&rsquo;re for
          education only — always manage your own risk. Coaches can post them quickly with a shorthand format.
        </QA>
        <QA q="What's the difference between the chat rooms and Messages?">
          <strong className="text-ink">Rooms</strong> are group chats — a main Community room plus a room for each coach.{' '}
          <strong className="text-ink">Messages</strong> are private 1-on-1 conversations. A gold dot appears on the Chat
          icon when there are new room messages you haven&rsquo;t seen.
        </QA>
        <QA q="How do the Journal and Calendar work?">
          The <strong className="text-ink">Journal</strong> lets you log your trades and notes, and the{' '}
          <strong className="text-ink">Calendar</strong> shows your profit/loss by day. These are premium features.
        </QA>
      </Section>

      <Section title="Membership &amp; payments">
        <QA q="How much does it cost?">
          Members who registered with our partner broker (ACCM) get premium access <strong className="text-ink">free</strong>.
          Other members can subscribe for USD $5 / month, and new non-ACCM members get a free trial to start.
        </QA>
        <QA q="How do I pay?">
          We accept PayPal and manual methods including GCash, Maya, and USDT (crypto). After sending payment, share your
          proof/reference as instructed on the <Link href="/upgrade" className="text-yellow-500 hover:underline">Upgrade</Link>{' '}
          page and a coach will activate your access.
        </QA>
        <QA q="Can I cancel or get a refund?">
          You can cancel anytime and keep access until the end of your paid period. Fees are generally non-refundable —
          see our <Link href="/terms" className="text-yellow-500 hover:underline">Terms</Link>.
        </QA>
      </Section>

      <Section title="Trading &amp; the app">
        <QA q="How do I connect to trade?">
          Open the <strong className="text-ink">Trading</strong> page for step-by-step instructions to download MetaTrader 5
          and connect to the broker server.
        </QA>
        <QA q="Can I install this as an app on my phone?">
          Yes — open the <Link href="/install" className="text-yellow-500 hover:underline">Install</Link> page for
          Android and iOS steps to add GHT Trading to your home screen.
        </QA>
        <QA q="How do I switch between light and dark mode?">
          The app follows your device preference by default; you can change it in{' '}
          <Link href="/settings" className="text-yellow-500 hover:underline">Settings</Link>.
        </QA>
      </Section>

      <Section title="Account &amp; safety">
        <QA q="How do I change my name or username?">
          Go to <Link href="/settings" className="text-yellow-500 hover:underline">Settings → Profile</Link> to update
          your name, username, photo, and bio.
        </QA>
        <QA q="How do I report a problem or a user?">
          Message a coach in <Link href="/chat" className="text-yellow-500 hover:underline">Chat</Link> or email{' '}
          <a href="mailto:support@ghttrading.co" className="text-yellow-500 hover:underline">support@ghttrading.co</a>.
          Never share your password with anyone.
        </QA>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <h2 className="text-lg font-bold text-ink mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-ink mb-1">{q}</p>
      <p className="text-sm text-ink2 leading-relaxed">{children}</p>
    </div>
  )
}
