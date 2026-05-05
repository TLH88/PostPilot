import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · PostPilot",
  description:
    "How PostPilot collects, uses, and protects your information — written to comply with GDPR (EU/UK) and CCPA/CPRA (California).",
};

/**
 * Privacy Policy for PostPilot, operated by Foundry 88 Labs LLC.
 *
 * Written to address GDPR / UK GDPR (EU / UK) and CCPA / CPRA
 * (California) requirements, plus general best-practice disclosures.
 * Reflects PostPilot's actual data flows: LinkedIn OAuth, third-party
 * AI providers (Anthropic / OpenAI / OpenRouter, plus user-supplied
 * BYOK keys), Supabase auth + data hosting, Stripe payments, and
 * Google AdSense on ad-supported tiers.
 */
export default function PrivacyPolicyPage() {
  const lastUpdated = "2026-05-05";
  const effectiveDate = "2026-05-05";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective: {effectiveDate} · Last updated: {lastUpdated}
        </p>
      </div>

      <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy describes how Foundry 88 Labs LLC, doing
          business as PostPilot (&ldquo;PostPilot,&rdquo;
          &ldquo;Foundry 88 Labs,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
          or &ldquo;our&rdquo;), collects, uses, shares, and protects
          personal information when you use the PostPilot service (the
          &ldquo;Service&rdquo;).
        </p>
        <p>
          This Policy is designed to comply with the EU General Data
          Protection Regulation (&ldquo;GDPR&rdquo;), the UK GDPR, the
          California Consumer Privacy Act as amended by the California
          Privacy Rights Act (&ldquo;CCPA/CPRA&rdquo;), and other
          applicable privacy laws. Where those laws give you specific
          rights, those rights are summarized in Sections 9 and 10.
        </p>
        <p>
          By using the Service, you acknowledge that you have read and
          understand this Policy.
        </p>

        <h2>2. Who We Are (Data Controller)</h2>
        <p>
          For the purposes of GDPR / UK GDPR and similar laws, the data
          controller for personal information processed through the
          Service is:
        </p>
        <p>
          <strong>Foundry 88 Labs LLC</strong>
          <br />
          Clark County, Washington, United States
          <br />
          Email:{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>
        </p>

        <h2>3. Information We Collect</h2>
        <p>We collect the following categories of personal information:</p>

        <h3>3.1 Information you provide directly</h3>
        <ul>
          <li>
            <strong>Account information:</strong> name, email address,
            password (stored as a salted hash by our authentication
            provider), and optional profile fields you fill in (headline,
            industries, expertise areas, content pillars).
          </li>
          <li>
            <strong>Content:</strong> post drafts, ideas, captions,
            hashtags, scheduled publication times, images you upload, and
            any other content you create or import into the Service.
          </li>
          <li>
            <strong>Payment information:</strong> if you subscribe to a paid
            plan, billing details are collected and processed by our
            payment processor (Stripe). We do not store your full payment
            card number on our servers; we store only a Stripe customer
            and subscription identifier.
          </li>
          <li>
            <strong>Communications:</strong> messages you send to support,
            feedback you submit through the in-app help center, and
            replies in any conversation thread you open.
          </li>
        </ul>

        <h3>3.2 Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device and connection:</strong> IP address, browser
            type and version, operating system, device type, and approximate
            geolocation derived from IP address.
          </li>
          <li>
            <strong>Usage data:</strong> pages and features you interact
            with, timestamps, action counts (e.g. number of brainstorms,
            posts created), referrer URL, and error / diagnostic events.
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> see{" "}
            <a href="#cookies">Section 7</a>.
          </li>
        </ul>

        <h3>3.3 Information from third parties</h3>
        <ul>
          <li>
            <strong>LinkedIn:</strong> when you connect your LinkedIn
            account, LinkedIn sends us an OAuth access token, an OAuth
            refresh token (when granted), your LinkedIn member identifier,
            and the profile information you authorize us to read (typically
            your name and email). Tokens are stored encrypted at rest.
            Token data is used solely to publish posts on your behalf and
            to verify the connection is healthy.
          </li>
          <li>
            <strong>Authentication providers:</strong> if you sign in via
            a third-party identity provider, we receive the identifiers
            and basic profile fields the provider returns.
          </li>
        </ul>

        <h2>4. How We Use Your Information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>Provide and operate the Service, including drafting,
            scheduling, and publishing posts on your behalf;</li>
          <li>Process AI-assisted content generation through third-party
            AI providers (see Section 6);</li>
          <li>Authenticate you and protect your account;</li>
          <li>Process payments and manage subscriptions;</li>
          <li>Communicate with you about the Service, including
            transactional, security, and policy-update messages;</li>
          <li>Provide customer support and respond to your requests;</li>
          <li>Detect, prevent, and respond to fraud, abuse, security
            incidents, and violations of our{" "}
            <Link href="/terms" className="font-medium text-primary underline">
              Terms of Service
            </Link>
            ;
          </li>
          <li>Measure, analyze, and improve the Service;</li>
          <li>Comply with legal obligations and enforce our agreements;</li>
          <li>Display advertising on Free and Personal plans (see
            Section 7).</li>
        </ul>

        <h2>5. Legal Bases for Processing (GDPR / UK GDPR)</h2>
        <p>
          If you are in the European Economic Area, the United Kingdom, or
          another jurisdiction with similar laws, we process your personal
          information on one or more of the following legal bases:
        </p>
        <ul>
          <li>
            <strong>Contract (Art. 6(1)(b) GDPR):</strong> processing
            necessary to deliver the Service to you under our Terms of
            Service.
          </li>
          <li>
            <strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong>{" "}
            improving and securing the Service, preventing fraud,
            understanding usage, and direct communications about features
            you already use. We have balanced these interests against your
            rights and freedoms.
          </li>
          <li>
            <strong>Consent (Art. 6(1)(a) GDPR):</strong> non-essential
            cookies, marketing emails (where required), and optional
            features. You may withdraw consent at any time without
            affecting the lawfulness of prior processing.
          </li>
          <li>
            <strong>Legal obligation (Art. 6(1)(c) GDPR):</strong>{" "}
            tax, accounting, and other obligations to which we are subject.
          </li>
        </ul>

        <h2>6. How We Share Your Information</h2>
        <p>
          We do not sell your personal information for monetary
          consideration. We share information only as described below.
        </p>

        <h3>6.1 Service providers (sub-processors)</h3>
        <p>
          We share information with vendors that help us operate the
          Service, under contractual obligations to use the information
          only for the purposes we direct. Categories include:
        </p>
        <ul>
          <li>
            <strong>Hosting and infrastructure:</strong> Vercel Inc.
            (application hosting), Supabase Inc. (database, authentication,
            file storage).
          </li>
          <li>
            <strong>AI providers:</strong> Anthropic PBC, OpenAI OpCo LLC,
            OpenRouter Inc., and other model providers we may engage.
            When you use AI features, the prompts you send and the content
            you choose to process (post drafts, ideas, etc.) are
            transmitted to the relevant provider for inference. If you
            configure a Bring-Your-Own-Key provider in your account
            settings, your prompts are sent to that provider under your
            agreement with them.
          </li>
          <li>
            <strong>Payments:</strong> Stripe, Inc. for payment
            processing and subscription management.
          </li>
          <li>
            <strong>Email:</strong> the email-delivery service we use to
            send transactional and notification emails.
          </li>
          <li>
            <strong>Analytics and error monitoring:</strong> services that
            help us measure usage and diagnose problems.
          </li>
          <li>
            <strong>Advertising (Free and Personal plans only):</strong>{" "}
            Google LLC (AdSense). Ad networks may set cookies and collect
            information about your interactions with ads to serve and
            measure them. See Section 7.
          </li>
        </ul>

        <h3>6.2 Publishing</h3>
        <p>
          When you instruct the Service to publish a post, we send the
          content to LinkedIn using the OAuth token you provided. The post
          becomes governed by LinkedIn&apos;s own terms and privacy policy
          once published.
        </p>

        <h3>6.3 Legal and safety</h3>
        <p>
          We may disclose information if we reasonably believe disclosure
          is necessary to (a) comply with a law, regulation, legal
          process, or governmental request; (b) enforce our Terms or
          investigate suspected violations; (c) detect or prevent fraud,
          security, or technical issues; or (d) protect the rights,
          property, or safety of PostPilot, our users, or the public.
        </p>

        <h3>6.4 Business transfers</h3>
        <p>
          If Foundry 88 Labs LLC is involved in a merger, acquisition,
          financing, reorganization, bankruptcy, or sale of assets, your
          information may be transferred as part of that transaction. We
          will notify you of any such transfer and any choices you may
          have.
        </p>

        <h3>6.5 With your consent</h3>
        <p>
          We may share information for any other purpose with your
          explicit consent.
        </p>

        <h2 id="cookies">7. Cookies and Tracking Technologies</h2>
        <p>
          We and our service providers use cookies, local storage, and
          similar technologies to operate and improve the Service.
          Categories include:
        </p>
        <ul>
          <li>
            <strong>Strictly necessary:</strong> session and authentication
            cookies, CSRF tokens, OAuth state cookies. These are required
            for the Service to function and cannot be disabled.
          </li>
          <li>
            <strong>Functional:</strong> theme preference, workspace
            selection, dismissed onboarding banners, and similar UX
            state.
          </li>
          <li>
            <strong>Analytics:</strong> aggregated usage measurement.
          </li>
          <li>
            <strong>Advertising (Free and Personal plans):</strong>{" "}
            Google AdSense and any partner cookies it sets to serve,
            measure, and limit the frequency of ads. You can opt out of
            personalized advertising at{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
            >
              Google Ads Settings
            </a>{" "}
            and via the industry tools at{" "}
            <a
              href="https://optout.aboutads.info"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
            >
              optout.aboutads.info
            </a>
            .
          </li>
        </ul>
        <p>
          Most browsers allow you to block or delete cookies through their
          settings. Blocking strictly necessary cookies will break parts of
          the Service.
        </p>

        <h2>8. International Data Transfers</h2>
        <p>
          We are based in the United States. If you access the Service
          from outside the United States, your information will be
          transferred to and processed in the United States and other
          countries where our service providers operate, which may have
          different data protection laws than your country.
        </p>
        <p>
          For transfers of personal data from the EEA, the UK, or
          Switzerland to the United States, we rely on safeguards such as
          the European Commission&apos;s Standard Contractual Clauses
          (and the UK Addendum where applicable) entered into with our
          sub-processors. You can request a copy of the relevant
          safeguards by contacting{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>
          .
        </p>

        <h2>9. Your Rights (GDPR / UK GDPR)</h2>
        <p>
          If you are in the EEA, the UK, or another jurisdiction with
          similar protections, you have the following rights subject to
          applicable conditions and exceptions:
        </p>
        <ul>
          <li>
            <strong>Right of access:</strong> obtain confirmation that we
            process your personal data and a copy of that data.
          </li>
          <li>
            <strong>Right to rectification:</strong> correct inaccurate
            data and complete incomplete data.
          </li>
          <li>
            <strong>Right to erasure (&ldquo;right to be
            forgotten&rdquo;):</strong> request deletion of your personal
            data in certain circumstances.
          </li>
          <li>
            <strong>Right to restriction of processing:</strong> ask us to
            limit how we use your data.
          </li>
          <li>
            <strong>Right to data portability:</strong> receive your data
            in a structured, commonly used, machine-readable format.
          </li>
          <li>
            <strong>Right to object:</strong> object to processing based
            on our legitimate interests, including profiling.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> where processing
            is based on consent, withdraw it at any time.
          </li>
          <li>
            <strong>Right to lodge a complaint:</strong> with your local
            supervisory authority.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>
          . We will respond within the timeframes required by applicable
          law (generally one month under GDPR).
        </p>

        <h2>10. California Privacy Rights (CCPA / CPRA)</h2>
        <p>
          If you are a California resident, you have the following rights
          under the CCPA/CPRA:
        </p>
        <ul>
          <li>
            <strong>Right to know:</strong> request that we disclose the
            categories and specific pieces of personal information we have
            collected about you, the sources, the purposes for collection,
            and the categories of third parties with whom we share it.
          </li>
          <li>
            <strong>Right to delete:</strong> request deletion of personal
            information we collected from you, subject to legal exceptions.
          </li>
          <li>
            <strong>Right to correct:</strong> request correction of
            inaccurate personal information.
          </li>
          <li>
            <strong>Right to opt out of sale or sharing:</strong> we do
            not sell personal information for monetary consideration. We
            may &ldquo;share&rdquo; identifiers and internet activity with
            advertising partners on Free and Personal plans for
            cross-context behavioral advertising as defined under CPRA.
            You can opt out by visiting the &ldquo;Do Not Sell or Share My
            Personal Information&rdquo; link in the Service footer (when
            available) or by enabling the Global Privacy Control (GPC)
            signal in your browser.
          </li>
          <li>
            <strong>Right to limit use of sensitive personal
            information:</strong> we do not use sensitive personal
            information for purposes outside what is reasonably necessary
            to provide the Service.
          </li>
          <li>
            <strong>Right to non-discrimination:</strong> we will not
            discriminate against you for exercising any of these rights.
          </li>
        </ul>
        <p>
          <strong>Categories of personal information collected in the
          past 12 months</strong> (as defined by Cal. Civ. Code §
          1798.140):
        </p>
        <ul>
          <li>Identifiers (name, email, account ID, IP address, LinkedIn
            member ID).</li>
          <li>Customer records (billing details processed by Stripe).</li>
          <li>Commercial information (subscription tier, transaction
            history).</li>
          <li>Internet or other electronic network activity (usage logs,
            referrer, device info).</li>
          <li>Geolocation data (approximate, derived from IP address).</li>
          <li>Inferences drawn from the above (e.g. content categories
            you engage with).</li>
          <li>Professional information (your LinkedIn headline /
            industries / expertise areas, if you provide them).</li>
        </ul>
        <p>
          <strong>Sources:</strong> directly from you, automatically as
          you use the Service, and from third parties (LinkedIn,
          authentication providers, payment processor).{" "}
          <strong>Business purposes:</strong> as described in Section 4.{" "}
          <strong>Categories of third parties with whom we share:</strong>{" "}
          as described in Section 6.
        </p>
        <p>
          To exercise your CCPA/CPRA rights, email{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>
          . You may designate an authorized agent to make a request on
          your behalf, subject to verification of the agent&apos;s
          authority. We will verify your identity before responding.
        </p>

        <h2>11. Data Retention</h2>
        <p>
          We retain personal information for as long as necessary to
          provide the Service and for the additional periods required to
          satisfy legal, tax, accounting, and dispute-resolution
          obligations. Specifically:
        </p>
        <ul>
          <li>
            <strong>Account data:</strong> while your account is active.
            When you delete your account, your data enters a 30-day
            soft-delete grace period (during which you can restore the
            account), after which it is permanently deleted from our
            primary systems. Backups are purged on a rolling schedule.
          </li>
          <li>
            <strong>LinkedIn tokens:</strong> deleted when you disconnect
            LinkedIn or close your account, whichever is sooner.
          </li>
          <li>
            <strong>Payment records:</strong> retained for the period
            required by tax and accounting law (typically seven years in
            the United States).
          </li>
          <li>
            <strong>Logs and security data:</strong> typically 30-90 days,
            longer where retention is required to investigate a security
            incident.
          </li>
        </ul>

        <h2>12. Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for users under the age of 16, and
          we do not knowingly collect personal information from children
          under 16. If you believe we have collected information from a
          child under 16, please contact us at{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>{" "}
          and we will delete it.
        </p>

        <h2>13. Security</h2>
        <p>
          We use administrative, technical, and physical safeguards
          designed to protect personal information from unauthorized
          access, use, alteration, and destruction. These include
          encryption in transit (TLS), encryption at rest for sensitive
          fields (including LinkedIn tokens), role-based access control,
          regular dependency updates, and audit logging. No system is
          perfectly secure; if you become aware of a security issue,
          please report it to{" "}
          <a
            href="mailto:security@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            security@mypostpilot.app
          </a>
          .
        </p>

        <h2>14. Third-Party Links</h2>
        <p>
          The Service may contain links to third-party websites and
          services (for example, LinkedIn, Stripe, our AI providers).
          This Policy does not apply to those third parties, and we are
          not responsible for their privacy practices. Please review the
          privacy policies of any third party before sharing information
          with them.
        </p>

        <h2>15. Changes to This Policy</h2>
        <p>
          We may update this Policy from time to time. When we do, we
          will revise the &ldquo;Last updated&rdquo; date at the top of
          this page. If the changes are material, we will provide
          additional notice (for example, by email or in-app notification)
          before the changes take effect. Your continued use of the
          Service after the update constitutes acceptance of the updated
          Policy.
        </p>

        <h2>16. Contact</h2>
        <p>
          For questions about this Policy or to exercise any of the
          rights described above:
        </p>
        <p>
          <strong>Foundry 88 Labs LLC</strong>
          <br />
          Attn: Privacy
          <br />
          Clark County, Washington, United States
          <br />
          Email:{" "}
          <a
            href="mailto:privacy@mypostpilot.app"
            className="font-medium text-primary underline"
          >
            privacy@mypostpilot.app
          </a>
        </p>
      </div>
    </main>
  );
}
