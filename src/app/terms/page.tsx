import Link from "next/link";

export const metadata = {
  title: "Terms of Service · PostPilot",
  description:
    "PostPilot Terms of Service — your agreement with us when you use the service.",
};

/**
 * BP-045 — Terms of Service.
 *
 * **DRAFT — pending legal review.** This page exists to (a) give the
 * BP-045 ad-blocker hard-gate modal a real document to link to, and
 * (b) lock in the ad-clause language the owner specifically asked for.
 * Sections marked TODO are placeholders that need attorney review and
 * proper jurisdiction-specific language before public launch.
 */
export default function TermsOfServicePage() {
  const lastUpdated = "2026-05-04";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Draft pending legal review.
          </p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            This document is a v1 draft to support the launch of PostPilot&apos;s
            Free and Personal tier ad experience. It will be replaced with an
            attorney-reviewed version before general availability. Sections
            marked &ldquo;TODO&rdquo; require legal completion.
          </p>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
        <h2>1. Acceptance of these Terms</h2>
        <p>
          By creating an account, signing in, or otherwise using PostPilot
          (the &ldquo;Service&rdquo;) provided by PostPilot (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by
          these Terms of Service (the &ldquo;Terms&rdquo;). If you do not
          agree, you may not use the Service.
        </p>

        <h2>2. The Service</h2>
        <p>
          PostPilot is an AI-assisted content creation tool for LinkedIn. We
          help you brainstorm, draft, and schedule posts. We may modify the
          Service at any time and may add, remove, or change features without
          prior notice.
        </p>

        <h2>3. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for any activity that occurs under your
          account. You agree to provide accurate information and to keep it
          up to date.
        </p>

        <h2>4. Subscription Plans &amp; Pricing</h2>
        <p>
          We offer Free, Personal, Professional, Team, and Enterprise plans.
          Plan limits, prices, and feature availability are described on our{" "}
          <Link href="/pricing" className="font-medium text-primary underline">
            pricing page
          </Link>
          . We may change plan terms at any time; if we do, changes apply at
          the start of your next billing cycle for paid plans.
        </p>

        <h2 id="ads" className="scroll-mt-20">
          5. Advertising on Free and Personal Plans
        </h2>
        <p>
          <strong>
            By using PostPilot on the Free or Personal plan, you agree to see
            and interact with the third-party advertisements we display
            within the Service.
          </strong>{" "}
          Ad revenue is a material source of funding that allows us to offer
          these plans at low or no cost. You may not block, hide, suppress,
          modify, or interfere with the display of these ads while using the
          Service on a Free or Personal plan.
        </p>
        <p>
          If we detect an ad-blocker, content blocker, or similar tool that
          prevents our ads from being shown on a Free or Personal plan, we
          may temporarily restrict your access to the Service until the
          blocker is disabled for our domain. You can avoid this restriction
          at any time by either (a) disabling your blocker for PostPilot or
          (b) upgrading to an ad-free plan (Professional, Team, or
          Enterprise). Professional and higher plans are ad-free and are not
          subject to this clause.
        </p>
        <p>
          Ads are served by third-party ad networks. We do not control the
          specific creative shown to you. If you encounter an ad you believe
          violates the network&apos;s policies, you can report it through
          the network&apos;s reporting tools.
        </p>

        <h2>6. AI Output</h2>
        <p>
          PostPilot uses AI models to generate content suggestions, drafts,
          and edits. AI output is provided as-is. You are responsible for
          reviewing all AI-generated content before publishing. We do not
          claim ownership of content you create using PostPilot, but you
          grant us a limited license to process your inputs and generated
          outputs for the purpose of operating the Service.
        </p>

        <h2>7. Acceptable Use</h2>
        <p>
          You agree not to use the Service to (a) violate any law, (b)
          infringe anyone&apos;s rights, (c) post content that is harmful,
          deceptive, or unlawful, (d) attempt to circumvent any technical
          limitation of the Service, including but not limited to budget
          caps, rate limits, or the advertising display obligations described
          above, or (e) reverse-engineer, scrape, or otherwise abuse the
          Service.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may close your account at any time from your account settings.
          We may suspend or terminate your access if you breach these Terms
          or if we are required to by law. After termination, sections that
          by their nature should survive (intellectual property, disclaimers,
          limitations of liability, governing law) will continue to apply.
        </p>

        <h2>9. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF
          ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
          SHALL POSTPILOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES.
        </p>

        <h2>11. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the
          updated Terms here and update the &ldquo;Last updated&rdquo; date
          at the top. Your continued use of the Service after the update
          constitutes acceptance of the new Terms.
        </p>

        <h2>12. Governing Law and Venue</h2>
        <p>
          These Terms, and any dispute arising out of or relating to these
          Terms or the Service, are governed by the laws of the State of
          Washington, without regard to its conflict-of-law principles. The
          parties agree that any such dispute shall be brought exclusively
          in the state or federal courts located in Clark County,
          Washington, and consent to the personal jurisdiction and venue of
          those courts and waive any objection based on inconvenient forum.
        </p>
        <p>
          For users residing in Oregon, the parties may, by mutual written
          agreement, instead bring such action in the state or federal
          courts located in Multnomah County, Oregon. PostPilot is operated
          from and serves the greater Washington and Oregon (Pacific
          Northwest) region; nothing in this section prevents either party
          from seeking injunctive or other equitable relief in any court of
          competent jurisdiction.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Contact us via the in-app help center.
        </p>
      </div>
    </main>
  );
}
