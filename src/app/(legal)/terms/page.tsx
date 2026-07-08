import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl sm:text-3xl font-black text-ink">Terms of Service</h1>
      <p className="text-sm text-ink3">Last updated: July 9, 2026</p>

      <p className="text-sm text-ink2 leading-relaxed pt-2">
        Welcome to the GHT Trading Community (&ldquo;GHT&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account
        or using the community app at community.ghttrading.co (the &ldquo;Service&rdquo;), you agree to these Terms. If you
        do not agree, please do not use the Service.
      </p>

      <Section title="1. Not financial advice">
        <p>
          GHT is an educational and community platform. All trade ideas, signals, analysis, webinars, and other content
          are provided for <strong className="text-ink">educational and informational purposes only</strong> and are not
          investment, financial, legal, or tax advice, nor a recommendation to buy or sell any instrument.
        </p>
        <p>
          Trading forex, gold, and other leveraged products carries a high level of risk and can result in the loss of
          some or all of your capital. Past performance is not indicative of future results. You are solely responsible
          for your own trading decisions. Never trade with money you cannot afford to lose, and consider seeking advice
          from an independent, licensed financial adviser.
        </p>
      </Section>

      <Section title="2. Eligibility & accounts">
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>You are responsible for keeping your login credentials secure and for all activity under your account.</li>
          <li>New sign-ups may require email verification and manual approval before access is granted.</li>
          <li>Provide accurate information; impersonation or fraudulent accounts may be removed.</li>
        </ul>
      </Section>

      <Section title="3. Membership & billing">
        <ul className="list-disc pl-5 space-y-1">
          <li>Some sections are free; certain premium features require an active membership.</li>
          <li>Members who registered with our partner broker (ACCM) receive premium access at no additional cost.</li>
          <li>Other members may access premium features via a paid subscription (currently USD $5 / month) after any free trial period.</li>
          <li>Payments are handled manually or via third-party processors (e.g. PayPal, GCash, Maya, or USDT crypto). Access is activated once payment is confirmed.</li>
          <li>Fees are billed in advance and are generally <strong className="text-ink">non-refundable</strong>, except where required by law. You may cancel at any time; access continues until the end of the paid period.</li>
          <li>We may change pricing or features with reasonable notice.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Share, resell, or redistribute paid content or your account access to others.</li>
          <li>Post unlawful, abusive, misleading, spam, or harmful content, or solicit others with unrelated schemes.</li>
          <li>Attempt to disrupt, reverse-engineer, scrape, or gain unauthorized access to the Service.</li>
          <li>Impersonate GHT staff, coaches, or other members.</li>
        </ul>
        <p>We may remove content and suspend or terminate accounts that violate these Terms.</p>
      </Section>

      <Section title="5. Your content">
        <p>
          You retain ownership of content you post (messages, posts, journal entries). By posting, you grant GHT a
          non-exclusive license to display and distribute it within the Service for the purpose of operating the
          community. You are responsible for the content you share and must have the rights to share it.
        </p>
      </Section>

      <Section title="6. Third-party services">
        <p>
          The Service integrates third-party tools such as TradingView charts, video embeds (YouTube, Facebook, Vimeo),
          and payment providers. Your use of those features may also be subject to the third party&rsquo;s own terms.
        </p>
      </Section>

      <Section title="7. Disclaimers & limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by
          law, GHT is not liable for any trading losses or for indirect, incidental, or consequential damages arising
          from your use of the Service. Nothing in these Terms limits liability that cannot be excluded by law.
        </p>
      </Section>

      <Section title="8. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms or to
          protect the community. Certain provisions (e.g. disclaimers and liability limits) survive termination.
        </p>
      </Section>

      <Section title="9. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Material changes will be posted here with an updated date.
          Continued use of the Service after changes take effect constitutes acceptance.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law rules.</p>
      </Section>

      <Section title="11. Contact">
        <p>
          Questions about these Terms? Reach us through the in-app chat or at{' '}
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
