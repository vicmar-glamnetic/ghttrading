import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl sm:text-3xl font-black text-ink">Privacy Policy</h1>
      <p className="text-sm text-ink3">Last updated: July 9, 2026</p>

      <p className="text-sm text-ink2 leading-relaxed pt-2">
        This Privacy Policy explains how the Gold Heist Trading Community (&ldquo;GHT&rdquo;, &ldquo;we&rdquo;) collects, uses,
        and protects your information when you use community.ghttrading.co (the &ldquo;Service&rdquo;). We keep data
        collection to what we need to run the community.
      </p>

      <Section title="1. Information we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Account details</strong> — your name, username, email address, password (stored encrypted), and optional profile photo/bio.</li>
          <li><strong className="text-ink">Content you create</strong> — posts, chat messages, comments, trade ideas, and journal entries.</li>
          <li><strong className="text-ink">Membership info</strong> — your subscription status, trial dates, and payment reference/notes you provide when confirming a payment.</li>
          <li><strong className="text-ink">Technical data</strong> — basic session and log data (e.g. login times) needed for security and to keep you signed in.</li>
        </ul>
        <p>We do <strong className="text-ink">not</strong> collect or store full card numbers — payments are handled by third-party providers (see below).</p>
      </Section>

      <Section title="2. How we use your information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and secure your account and keep you signed in.</li>
          <li>To provide community features (chat, feed, signals, education, journal).</li>
          <li>To manage membership access, trials, and payments.</li>
          <li>To review and approve new sign-ups and prevent fraud, spam, and abuse.</li>
          <li>To communicate with you (e.g. verification codes, password resets, important notices).</li>
        </ul>
      </Section>

      <Section title="3. Service providers we rely on">
        <p>We share limited data with trusted providers only as needed to operate the Service:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Hosting &amp; database</strong> — our app and data are hosted with cloud infrastructure providers.</li>
          <li><strong className="text-ink">Payments</strong> — processors such as PayPal (and manual methods like USDT crypto) handle transactions. Their handling of your data is governed by their own privacy policies.</li>
          <li><strong className="text-ink">Email</strong> — we use an email service to send verification and account messages.</li>
          <li><strong className="text-ink">Embedded content</strong> — TradingView charts and video embeds (YouTube, Facebook, Vimeo) may set their own cookies when displayed.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="4. Cookies & sessions">
        <p>
          We use a secure session cookie to keep you logged in and to remember your theme preference. These are essential
          for the Service to function. Embedded third-party content may use additional cookies outside our control.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          We keep your information for as long as your account is active. If you delete your account or ask us to remove
          your data, we will delete or anonymize it within a reasonable period, except where we must retain certain
          records to comply with legal obligations or resolve disputes.
        </p>
      </Section>

      <Section title="6. Your rights">
        <ul className="list-disc pl-5 space-y-1">
          <li>Access, update, or correct your profile information from Settings.</li>
          <li>Request a copy or deletion of your personal data.</li>
          <li>Withdraw consent or object to certain processing, where applicable under Philippine data-privacy law.</li>
        </ul>
        <p>To exercise these rights, contact us using the details below.</p>
      </Section>

      <Section title="7. Security">
        <p>
          Passwords are stored using industry-standard hashing, and access is protected by authenticated sessions. No
          system is perfectly secure, but we take reasonable measures to protect your data. Please keep your password
          confidential.
        </p>
      </Section>

      <Section title="8. Children">
        <p>The Service is not directed to anyone under 18, and we do not knowingly collect data from minors.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>We may update this policy from time to time. Material changes will be posted here with an updated date.</p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions or requests about your privacy? Reach us through the in-app chat or at{' '}
          <a href="mailto:support@ghttrading.co" className="text-yellow-500 hover:underline">support@ghttrading.co</a>.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-4">
      <h2 className="text-lg font-bold text-ink mb-2">{title}</h2>
      <div className="space-y-2 text-sm text-ink2 leading-relaxed">{children}</div>
    </section>
  )
}
