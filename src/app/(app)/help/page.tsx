import { HelpCircle, ExternalLink, AlertTriangle, CreditCard, BarChart3, Lightbulb, BookOpen, Bot, CalendarDays, Play, KeyRound, Lock } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { TutorialRestartSection, RunTutorialButton } from "@/components/tutorial/tutorial-restart-section";
import { Badge } from "@/components/ui/badge";
import { POST_TEMPLATES_ENABLED } from "@/lib/feature-flags";

type PaidTier = "personal" | "professional";

function HelpPaidBadge({ tier }: { tier: PaidTier }) {
  const label =
    tier === "professional"
      ? "Paid feature — Professional and above"
      : "Paid feature — Personal and above";
  return (
    <Badge variant="secondary" className="mb-3 gap-1 font-normal">
      <Lock className="size-3" />
      {label}
    </Badge>
  );
}

function StepList({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-foreground/90">{children}</ol>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
      <strong>Tip:</strong> {children}
    </div>
  );
}

function BillingNote({ provider }: { provider: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
      <CreditCard className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-sm text-amber-900 dark:text-amber-200">
        <strong>Billing note:</strong> {provider} may require you to purchase API credits in
        addition to any standalone subscription you may have. API usage is typically billed
        separately from consumer products. Check their pricing page for current rates before
        getting started.
      </p>
    </div>
  );
}

function ExternalUrl({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      {/* Page header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          PostPilot uses your own AI provider API key to generate content. Below you&apos;ll find
          step-by-step guides for creating and managing API keys with each supported provider.
        </p>
      </div>

      {/* ─── Guided Tours ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Play className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Guided Tours</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Interactive walkthroughs that show you how each part of PostPilot works.
            Restart any tour at any time.
          </p>
        </div>
        <TutorialRestartSection />
      </section>

      {/* ─── Finding & Creating Personal AI Provider API Keys ─── */}
      <section id="api-keys" className="space-y-4 rounded-xl border bg-muted/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Finding &amp; Creating Personal AI Provider API Keys</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            On the Professional plan you can bring your own API key (BYOK) for each supported AI
            provider. The guides below walk you through creating, accessing, and billing keys for
            OpenAI, Anthropic, Google, and Perplexity. Personal-plan users don&apos;t need to follow
            these steps — you&apos;re on PostPilot&apos;s managed system keys.
          </p>

          {/* Security note — kept next to the BYOK guides where it's most
              relevant. */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Never share your API keys publicly or commit them to version control. PostPilot encrypts
              your key with AES-256-GCM and only uses it server-side.
            </p>
          </div>
        </div>

      {/* ─── Anthropic ─── */}
      <CollapsibleCard
        title="Anthropic (Claude)"
        description="Claude Opus, Sonnet, and Haiku models"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="professional" />
        <BillingNote provider="Anthropic" />

        <h4 className="text-sm font-semibold">Creating a new API key</h4>
        <StepList>
          <li>
            Go to the Anthropic Console at{" "}
            <ExternalUrl href="https://console.anthropic.com">console.anthropic.com</ExternalUrl>{" "}
            and sign up or log in with your email.
          </li>
          <li>
            Once logged in, click <strong>API Keys</strong> in the left sidebar. You can also navigate
            directly to{" "}
            <ExternalUrl href="https://console.anthropic.com/settings/keys">
              console.anthropic.com/settings/keys
            </ExternalUrl>.
          </li>
          <li>
            Click the <strong>&quot;Create Key&quot;</strong> button in the top-right corner.
          </li>
          <li>
            Give your key a descriptive name (e.g. &quot;PostPilot&quot;) and click{" "}
            <strong>Create Key</strong>.
          </li>
          <li>
            Your new key will be displayed <strong>once</strong>. Copy it immediately and paste it
            into PostPilot&apos;s API key field. It starts with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sk-ant-</code>.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Accessing an existing key</h4>
        <p className="text-sm text-foreground/80">
          Anthropic does not let you view a previously created key&apos;s full value. If you&apos;ve
          lost your key, you&apos;ll need to create a new one from the{" "}
          <ExternalUrl href="https://console.anthropic.com/settings/keys">API Keys page</ExternalUrl>.
          You can delete old keys you no longer need.
        </p>

        <h4 className="text-sm font-semibold">Adding credits</h4>
        <p className="text-sm text-foreground/80">
          Navigate to{" "}
          <ExternalUrl href="https://console.anthropic.com/settings/billing">
            Settings &rarr; Billing
          </ExternalUrl>{" "}
          in the console to add a payment method and purchase credits. Anthropic offers a small
          amount of free credits for new accounts.
        </p>

        <Tip>
          You can set spending limits under <strong>Settings &rarr; Limits</strong> in the
          Anthropic Console to prevent unexpected charges.
        </Tip>
      </CollapsibleCard>

      {/* ─── OpenAI ─── */}
      <CollapsibleCard
        title="OpenAI (GPT / o-series)"
        description="GPT-4.1, GPT-4o, o3, and o4-mini models"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="professional" />
        <BillingNote provider="OpenAI" />

        <h4 className="text-sm font-semibold">Creating a new API key</h4>
        <StepList>
          <li>
            Go to the OpenAI Platform at{" "}
            <ExternalUrl href="https://platform.openai.com">platform.openai.com</ExternalUrl>{" "}
            and sign up or log in. Note: this is separate from the ChatGPT consumer app.
          </li>
          <li>
            Click your profile icon in the top-right corner, then select{" "}
            <strong>Your profile</strong>. Navigate to the <strong>API Keys</strong> tab
            on the left, or go directly to{" "}
            <ExternalUrl href="https://platform.openai.com/api-keys">
              platform.openai.com/api-keys
            </ExternalUrl>.
          </li>
          <li>
            Click <strong>&quot;Create new secret key&quot;</strong>.
          </li>
          <li>
            Give it a name (e.g. &quot;PostPilot&quot;), choose permissions (default &quot;All&quot;
            is fine), and click <strong>Create secret key</strong>.
          </li>
          <li>
            Copy the key immediately. It starts with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sk-</code> and won&apos;t be
            shown again. Paste it into PostPilot.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Accessing an existing key</h4>
        <p className="text-sm text-foreground/80">
          OpenAI does not display existing key values after creation. You can view your key names
          and last-used dates on the{" "}
          <ExternalUrl href="https://platform.openai.com/api-keys">API Keys page</ExternalUrl>,
          but you&apos;ll need to create a new key if you&apos;ve lost the original value.
        </p>

        <h4 className="text-sm font-semibold">Adding credits</h4>
        <p className="text-sm text-foreground/80">
          Go to{" "}
          <ExternalUrl href="https://platform.openai.com/settings/organization/billing">
            Settings &rarr; Billing
          </ExternalUrl>{" "}
          to add a payment method and purchase credits. A ChatGPT Plus subscription does{" "}
          <strong>not</strong> include API credits. They must be purchased separately.
        </p>

        <Tip>
          Set monthly usage limits under <strong>Settings &rarr; Limits</strong> to control your
          spending. OpenAI also supports project-level API keys for better access control.
        </Tip>
      </CollapsibleCard>

      {/* ─── Google ─── */}
      <CollapsibleCard
        title="Google (Gemini)"
        description="Gemini 2.5 Pro, Flash, and Flash Lite models"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="professional" />
        <BillingNote provider="Google" />

        <h4 className="text-sm font-semibold">Creating a new API key</h4>
        <StepList>
          <li>
            Go to Google AI Studio at{" "}
            <ExternalUrl href="https://aistudio.google.com">aistudio.google.com</ExternalUrl>{" "}
            and sign in with your Google account.
          </li>
          <li>
            Click <strong>&quot;Get API key&quot;</strong> in the left sidebar, or navigate directly
            to{" "}
            <ExternalUrl href="https://aistudio.google.com/apikey">
              aistudio.google.com/apikey
            </ExternalUrl>.
          </li>
          <li>
            Click <strong>&quot;Create API key&quot;</strong>. You may be asked to select or create a
            Google Cloud project. The default project is fine for getting started.
          </li>
          <li>
            Your key will be displayed. Copy it and paste it into PostPilot. Google API keys
            typically start with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AIza</code>.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Accessing an existing key</h4>
        <p className="text-sm text-foreground/80">
          Unlike other providers, Google lets you view your existing API keys at any time. Go to the{" "}
          <ExternalUrl href="https://aistudio.google.com/apikey">API Keys page</ExternalUrl> in
          Google AI Studio to see, copy, or delete your keys.
        </p>

        <h4 className="text-sm font-semibold">Adding credits</h4>
        <p className="text-sm text-foreground/80">
          Google offers a generous free tier for Gemini API usage. For higher rate limits or
          production use, you&apos;ll need to enable billing on your Google Cloud project at{" "}
          <ExternalUrl href="https://console.cloud.google.com/billing">
            console.cloud.google.com/billing
          </ExternalUrl>.
        </p>

        <Tip>
          The free tier of Gemini API is quite generous and may be sufficient for moderate PostPilot
          usage. Check the{" "}
          <ExternalUrl href="https://ai.google.dev/pricing">pricing page</ExternalUrl> for current
          limits.
        </Tip>
      </CollapsibleCard>

      {/* ─── Perplexity ─── */}
      <CollapsibleCard
        title="Perplexity (Sonar)"
        description="Sonar Pro, Sonar Reasoning, and Deep Research models"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="professional" />
        <BillingNote provider="Perplexity" />

        <h4 className="text-sm font-semibold">Creating a new API key</h4>
        <StepList>
          <li>
            Go to the Perplexity API settings at{" "}
            <ExternalUrl href="https://www.perplexity.ai/settings/api">
              perplexity.ai/settings/api
            </ExternalUrl>{" "}
            and sign in with your Perplexity account. Create an account at{" "}
            <ExternalUrl href="https://www.perplexity.ai">perplexity.ai</ExternalUrl> if you
            don&apos;t have one.
          </li>
          <li>
            On the API settings page, scroll to the <strong>API Keys</strong> section.
          </li>
          <li>
            Click <strong>&quot;Generate&quot;</strong> to create a new API key.
          </li>
          <li>
            Copy the key immediately. Perplexity keys start with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pplx-</code>. Paste it into
            PostPilot.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Accessing an existing key</h4>
        <p className="text-sm text-foreground/80">
          You can view and manage your existing API keys on the{" "}
          <ExternalUrl href="https://www.perplexity.ai/settings/api">
            API settings page
          </ExternalUrl>. Perplexity allows you to see your active keys and revoke any you no longer
          need.
        </p>

        <h4 className="text-sm font-semibold">Adding credits</h4>
        <p className="text-sm text-foreground/80">
          Perplexity API access requires purchasing credits separately from any Perplexity Pro
          subscription. You can add credits directly on the{" "}
          <ExternalUrl href="https://www.perplexity.ai/settings/api">API settings page</ExternalUrl>{" "}
          under the billing section. A Perplexity Pro subscription does <strong>not</strong> include
          API credits.
        </p>

        <Tip>
          Perplexity&apos;s Sonar models include built-in web search capabilities, making them
          especially useful for creating content about trending topics and current events.
        </Tip>
      </CollapsibleCard>

      </section>

      {/* ─── BYOK Troubleshooting ─── */}
      <section id="api-keys-troubleshooting" className="space-y-4 rounded-xl border bg-muted/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Troubleshooting Your AI Provider</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When something isn&apos;t working with your own provider key — failed
            tests, missing models, calls returning errors mid-draft — work
            through the checks below in order. Most issues fall into one of
            five categories.
          </p>
        </div>

        <CollapsibleCard
          title="Step 1 — Verify the key is saved and in use"
          description="Make sure PostPilot is actually using your key, not the built-in AI."
          defaultOpen={false}
        >
          <p className="text-sm text-foreground/80">
            How the AI Configuration card is laid out:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
            <li>
              The blue <strong>&quot;Use PostPilot&apos;s built-in AI&quot;</strong>{" "}
              toggle at the top decides whether PostPilot routes through
              its managed gateway or through your provider keys below.
            </li>
            <li>
              Below that are the amber <strong>key-secrecy banner</strong>{" "}
              and your <strong>Your AI Providers</strong> list. Each
              configured provider is a card with a green check at the
              top-left if at least one of its capabilities has been
              successfully tested.
            </li>
            <li>
              Each provider card contains one or more <strong>sub-rows</strong>{" "}
              — one for <em>Text</em>, one for <em>Image</em> — depending on
              what the provider supports. The <strong>active sub-row</strong>{" "}
              has a chunky green bar on the left, a soft green fill, and a
              green <strong>&quot;✓ IN USE&quot;</strong> pill. The model
              picker, Test button, Set Active button, and Delete button all
              live inside the sub-row.
            </li>
          </ul>

          <StepList>
            <li>
              Open <strong>Settings → AI Configuration</strong>.
            </li>
            <li>
              Find the <strong>&quot;Use PostPilot&apos;s built-in AI&quot;</strong>{" "}
              toggle at the top. If it&apos;s ON, PostPilot is routing
              through its managed gateway and your key isn&apos;t being used
              at all. Switch it off if you want your key to take over.
            </li>
            <li>
              Find your provider&apos;s card in the{" "}
              <strong>Your AI Providers</strong> list. The card header
              should show a green check on the left.
            </li>
            <li>
              Inside the card, find the sub-row for the capability you
              expected to use (<em>Text</em> or <em>Image</em>). It should
              have a green left bar, a green <strong>&quot;✓ IN USE&quot;</strong>{" "}
              pill, and a soft green background. If it doesn&apos;t, click
              the blue <strong>Set Active</strong> button on that sub-row.
            </li>
            <li>
              If you don&apos;t see your provider in the list at all, click
              the blue <strong>+ Add Provider Key</strong> button at the
              top-right of the section. A modal opens where you pick the
              provider, choose <em>Text</em> and/or <em>Image</em>, and paste
              your key. PostPilot validates it before saving.
            </li>
          </StepList>
        </CollapsibleCard>

        <CollapsibleCard
          title="Step 2 — Test the key from the dashboard"
          description="Tells you in seconds whether the key itself is valid."
          defaultOpen={false}
        >
          <StepList>
            <li>
              Inside the provider&apos;s card, find the sub-row for the
              capability you want to test (<em>Text</em> or <em>Image</em>)
              and click the <strong>Test</strong> button on the right side
              of that sub-row.
            </li>
            <li>
              <strong>Green toast (&quot;key tested OK&quot;)</strong> — the
              key works against the provider&apos;s servers and you have
              account access. The card header&apos;s green &quot;Tested
              Xs ago&quot; timestamp refreshes. Move to Step 3 if calls still
              fail.
            </li>
            <li>
              <strong>Red toast with &quot;Invalid key&quot;</strong> — the
              key was rejected by the provider. Common causes:
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Key was copied incorrectly (extra space, missing prefix).</li>
                <li>Key was rotated or revoked on the provider&apos;s side.</li>
                <li>Wrong key type pasted (e.g., a project key vs. a user key).</li>
              </ul>
              Click <strong>+ Add Provider Key</strong>, paste a fresh key
              for the same provider with the same capability ticked, and
              save — it overwrites the old one.
            </li>
            <li>
              <strong>&quot;API key test failed: …&quot; with a network
              error</strong> — your provider may be experiencing an outage.
              Check the provider&apos;s status page (linked from your
              account console) and retry in a few minutes.
            </li>
          </StepList>
          <Tip>
            For providers that support both Text and Image (OpenAI, Google),
            each capability has its own Test button. Testing Text doesn&apos;t
            test Image and vice versa — they share the key but hit different
            provider endpoints.
          </Tip>
        </CollapsibleCard>

        <CollapsibleCard
          title="Step 3 — Check the model is still available"
          description="Models get deprecated. Your selection may have aged out."
          defaultOpen={false}
        >
          <StepList>
            <li>
              Inside the provider&apos;s card, find the sub-row for the
              capability with the issue. The <strong>model dropdown</strong>{" "}
              sits to the right of the kind label inside that sub-row.
            </li>
            <li>
              If the dropdown is empty or shows fewer choices than you
              remember, click <strong>Test</strong> on the same sub-row —
              that triggers a fresh model-list pull from the provider for
              that capability.
            </li>
            <li>
              Pick a model that&apos;s clearly listed as current
              (e.g. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">gpt-4.1</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">claude-opus-4-7</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">gemini-2.5-pro</code>).
              Avoid <code className="rounded bg-muted px-1.5 py-0.5 text-xs">-preview</code>{" "}
              variants for production use — they can change behavior without
              notice.
            </li>
            <li>
              If a model you previously used is gone, the provider has
              deprecated it. Pick its replacement from the dropdown — your
              choice saves automatically and applies to that capability
              only. Text and Image model preferences are independent.
            </li>
          </StepList>
        </CollapsibleCard>

        <CollapsibleCard
          title="Step 4 — Confirm billing / quota / rate limits with the provider"
          description="Most mid-call failures are about money or rate limits, not the key itself."
          defaultOpen={false}
        >
          <p className="text-sm text-foreground/80">
            A valid key can still produce errors mid-draft if your
            provider account has billing or usage problems. Log into the
            provider&apos;s console and confirm:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
            <li>
              <strong>Payment method on file</strong> — providers reject
              calls when the card on file fails to charge.
            </li>
            <li>
              <strong>Account credits or balance</strong> — Anthropic and
              OpenAI both require positive balance for API access.
            </li>
            <li>
              <strong>Rate limits not exhausted</strong> — Free-tier accounts
              and new Pay-as-You-Go accounts have low per-minute caps.
              Check the provider&apos;s usage dashboard.
            </li>
            <li>
              <strong>Project / organization access</strong> — OpenAI keys
              are scoped to a project; if the project was archived, the key
              stops working.
            </li>
          </ul>
        </CollapsibleCard>

        <CollapsibleCard
          title="Step 5 — Fall back to PostPilot's built-in AI while you investigate"
          description="So you're not blocked from drafting while sorting out the provider issue."
          defaultOpen={false}
        >
          <StepList>
            <li>
              Open <strong>Settings → AI Configuration</strong>.
            </li>
            <li>
              Toggle <strong>Use PostPilot&apos;s built-in AI</strong> ON.
              All AI features (drafting, brainstorming, hashtags, image
              generation) immediately route through PostPilot&apos;s
              managed gateway against your plan quota — no provider key
              required.
            </li>
            <li>
              Once you&apos;ve fixed the underlying issue with your provider
              key, toggle the gateway back OFF and you&apos;re routed
              through your own key again.
            </li>
          </StepList>
          <Tip>
            If your built-in AI is also failing, check the in-app{" "}
            <strong>Notifications</strong> bell — admin alerts about gateway
            issues land there. You can also reach out at{" "}
            <ExternalUrl href="mailto:support@mypostpilot.app">
              support@mypostpilot.app
            </ExternalUrl>
            .
          </Tip>
        </CollapsibleCard>
      </section>

      {/* ─── LinkedIn Analytics Import ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Importing Analytics</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
          PostPilot can import your LinkedIn post performance data so you can track engagement
          and identify your best-performing content.
        </p>
      </div>

      <CollapsibleCard
        title="Import LinkedIn Post Analytics"
        description="Import impressions and engagement data from your LinkedIn profile"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="personal" />
        <p className="text-sm text-foreground/80 mb-3">
          LinkedIn provides analytics on your post performance including impressions and engagements.
          You can import this data into PostPilot in two passes : one for impressions and one for
          engagements. PostPilot will automatically match the data to your existing posts.
        </p>

        <h4 className="text-sm font-semibold">Importing Impressions</h4>
        <StepList>
          <li>
            Open your <strong>LinkedIn profile</strong> and scroll down to the{" "}
            <strong>Analytics</strong> section (located just above the &quot;About&quot; section).
          </li>
          <li>
            Click the <strong>&quot;Show all analytics&quot;</strong> link at the bottom of the
            Analytics section.
          </li>
          <li>
            Click the <strong>top-right box</strong> to view <strong>Post Impressions</strong>.
          </li>
          <li>
            Adjust the filters to <strong>90 days</strong> (or your preferred time range) and ensure{" "}
            <strong>Impressions</strong> is selected.
          </li>
          <li>
            Select the entire page using <strong>Ctrl+A</strong> (Windows) or{" "}
            <strong>Cmd+A</strong> (Mac), then copy with <strong>Ctrl+C</strong> /{" "}
            <strong>Cmd+C</strong>.
          </li>
          <li>
            In PostPilot, go to the <strong>Analytics</strong> page and click{" "}
            <strong>&quot;Import from LinkedIn&quot;</strong>.
          </li>
          <li>
            Paste the copied content into the text area and click{" "}
            <strong>&quot;Parse &amp; Preview&quot;</strong>. PostPilot will match the data to your
            posts and show you the results.
          </li>
          <li>
            Review the matches and click <strong>&quot;Import&quot;</strong> to save the
            impressions data.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Importing Engagements</h4>
        <StepList>
          <li>
            Go back to your LinkedIn analytics page and change the filter from{" "}
            <strong>Impressions</strong> to <strong>Engagements</strong>.
          </li>
          <li>
            Select all (<strong>Ctrl+A</strong> / <strong>Cmd+A</strong>) and copy (
            <strong>Ctrl+C</strong> / <strong>Cmd+C</strong>) the entire page again.
          </li>
          <li>
            In PostPilot, click <strong>&quot;Import from LinkedIn&quot;</strong> again.
          </li>
          <li>
            Paste the engagement data, click <strong>&quot;Parse &amp; Preview&quot;</strong>,
            review the matches, and click <strong>&quot;Import&quot;</strong>.
          </li>
        </StepList>

        <Tip>
          You can repeat this process anytime to update your analytics with the latest data.
          PostPilot will update existing values rather than creating duplicates. For best results,
          import both impressions and engagements to get a complete picture of your post performance.
        </Tip>
      </CollapsibleCard>

      </section>

      {/* ─── Getting Started ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          <h2 id="getting-started" className="text-lg font-semibold">Getting Started</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          New to PostPilot? These guides walk you through the core workflow from brainstorming ideas
          to publishing on LinkedIn. You can also <RunTutorialButton tutorialId="overview-app" label="run the App Overview tutorial" /> for
          an interactive walkthrough of the dashboard.
        </p>
      </div>

      <CollapsibleCard
        title="How Ideas Work"
        description="Generate, curate, and develop ideas into posts"
        defaultOpen={false}
      >
        <p id="idea-generation" className="text-sm text-foreground/80 mb-3">
          The Idea Bank is your brainstorming hub. Use AI to generate content ideas based on your
          expertise and content pillars, then curate and develop the best ones into full posts.
        </p>

        <h4 className="text-sm font-semibold">The idea workflow</h4>
        <StepList>
          <li>
            Click <strong>&quot;Generate Ideas&quot;</strong> on the Ideas page. Choose your content
            pillars, set the number of ideas, and let AI brainstorm suggestions tailored to your
            expertise. The <strong>&quot;Lean into trending topics&quot;</strong> toggle (on by
            default) lets the AI draw on recent industry conversations, news, and frameworks
            relevant to your expertise. Turn it off if you want purely evergreen ideas.
          </li>
          <li>
            Review the generated ideas and save the ones you want to keep. Each idea
            shows its title, description, and content pillar so you can pick what
            fits your audience best.
          </li>
          <li>
            <strong>Edit</strong> any idea to refine its title or description.
            <strong> Archive</strong> ideas you want to save for later.
          </li>
          <li>
            When you&apos;re ready, click <strong>&quot;Develop&quot;</strong> to turn an idea into
            a post. The AI will automatically generate an initial draft based on your idea&apos;s
            title and description, using your voice and style.
          </li>
        </StepList>

        <Tip>
          You can also add ideas manually without AI. Use the Idea Bank as a running list of content
          topics so you never run out of things to write about.
        </Tip>

        <RunTutorialButton tutorialId="howto-idea-generation" label="Run the Idea Generation tutorial" />
      </CollapsibleCard>

      <CollapsibleCard
        title="Content Pillars"
        description="The 3-5 themes that anchor your professional brand"
        defaultOpen={false}
      >
        <h4 id="content-pillars" className="text-sm font-semibold">What content pillars are</h4>
        <p className="text-sm text-foreground/80 mb-3">
          Content pillars are the 3-5 themes you consistently post about. They&apos;re the topics
          your audience expects from you, and they anchor your professional brand on LinkedIn.
        </p>

        <h4 className="text-sm font-semibold">Why they matter</h4>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
          <li>
            A balanced mix across pillars keeps your audience engaged and saves them from
            seeing the same angle every week.
          </li>
          <li>
            Consistency around a small set of themes positions you as a thought leader in
            those areas, rather than a generalist.
          </li>
        </ul>

        <h4 className="text-sm font-semibold mt-4">How to set yours</h4>
        <p className="text-sm text-foreground/80 mb-3">
          You pick your pillars during the onboarding wizard. You can update them anytime
          from your <strong>Profile</strong> page — adjust the labels, add new pillars, or
          retire ones that no longer fit.
        </p>

        <h4 className="text-sm font-semibold">How PostPilot uses them</h4>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
          <li>
            AI brainstorming uses your pillars to generate ideas that fit your themes.
          </li>
          <li>
            Each idea and post can be tagged with a pillar so your library stays organized.
          </li>
          <li>
            The dashboard <strong>Content Balance</strong> card shows your distribution
            across pillars so you can spot themes you&apos;re overusing or neglecting.
          </li>
        </ul>

        <Tip>
          Pick pillars that overlap with your audience&apos;s interests, not just yours. The
          best pillars sit at the intersection of what you know and what your audience
          wants to read.
        </Tip>
      </CollapsibleCard>

      <CollapsibleCard
        title="Writing Your First Post"
        description="Use the post editor, AI assistant, and formatting tools"
        defaultOpen={false}
      >
        <p className="text-sm text-foreground/80 mb-3">
          The post editor is where you draft, refine, and polish your LinkedIn content. It includes
          AI-powered assistance, formatting tools, and a real-time character counter.
        </p>

        <h4 className="text-sm font-semibold">Editor basics</h4>
        <StepList>
          <li>
            Create a new post from the <strong>Posts</strong> page or develop one from your Idea
            Bank. When developing an idea, the AI automatically generates a first draft for you.
          </li>
          <li>
            The <strong>status pipeline</strong> at the top of the editor shows your post&apos;s
            workflow stage (Draft → Scheduled → Published). Hover any step to see its meaning
            and the relevant timestamp.
          </li>
          <li>
            Write your content in the main text area. The character counter shows your post
            length (LinkedIn allows up to 3,000 characters).
          </li>
          <li>
            Use the <strong>editor toolbar</strong> above the text area to insert emojis, bullet
            and numbered lists, suggest hashtags, save selected text to your Content Library, and
            run AI Enhance templates.
          </li>
          <li>
            Type <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/</code> in the editor
            to open the <strong>slash command menu</strong> with quick AI actions like{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/hook</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/expand</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/shorten</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/cta</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/hashtags</code>, and more.
          </li>
          <li>
            Use the bottom <strong>3-dot Actions</strong> menu to publish, schedule, mark as
            manually posted, archive, or delete your post.
          </li>
          <li>
            Use the <strong>Versions</strong> menu (bottom-left of the editor) to save snapshots,
            create a separate post from the current content, or browse your version history.
            Autosaves are hidden by default — toggle <strong>&quot;Show autosaves&quot;</strong>{" "}
            to reveal them.
          </li>
          <li>
            Click the chat icon in the toolbar (tooltip:{" "}
            <strong>&quot;Show Post Pilot AI&quot;</strong>) to open the Post Pilot AI panel.
            The AI has full context of your post (title, content, status, and content pillar) and
            can help you draft, refine, or improve your writing.
          </li>
          <li>
            Hashtags are written inline in the body of your post (e.g.{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">#leadership</code>). Use the
            hashtag icon in the toolbar to have AI suggest relevant tags. Upload or generate images
            and preview your post before publishing.
          </li>
        </StepList>

        <Tip>
          Your post auto-saves as you type. Look for the cloud icon in the header to confirm your
          changes are saved.
        </Tip>

        <RunTutorialButton tutorialId="howto-post-creation" label="Run the Post Creation tutorial" />
      </CollapsibleCard>

      <CollapsibleCard
        title="Publishing to LinkedIn"
        description="Direct publish, scheduling, or manual copy-paste"
        defaultOpen={false}
      >
        <p className="text-sm text-foreground/80 mb-3">
          PostPilot gives you three ways to get your content onto LinkedIn, depending on your
          preference and setup.
        </p>

        <h4 className="text-sm font-semibold">Option 1: Direct publish</h4>
        <p className="text-sm text-foreground/80 mb-3">
          If you&apos;ve connected your LinkedIn account, open the <strong>3-dot Actions</strong>{" "}
          menu at the bottom of the editor and choose{" "}
          <strong>&quot;Post to LinkedIn&quot;</strong>. A <strong>preview dialog</strong> opens
          showing exactly how your post will appear on LinkedIn. From the preview you can add or
          change the post image, jump to scheduling, or click{" "}
          <strong>&quot;Approve &amp; Publish&quot;</strong> to post immediately. Posts are never
          sent without your confirmation.
        </p>

        <h4 className="text-sm font-semibold">Option 2: Schedule for later</h4>
        <p className="text-sm text-foreground/80 mb-3">
          Choose <strong>&quot;Schedule Post&quot;</strong> from the 3-dot Actions menu (or use
          the dedicated Schedule button next to it, or the Schedule button inside the preview
          dialog) to set a specific date and time. Your post will be automatically published at
          the scheduled time. It is <strong>not</strong> published immediately when you schedule
          it. You can track the post&apos;s progress in the <strong>status pipeline</strong> at
          the top of the editor.
        </p>

        <h4 className="text-sm font-semibold">Option 3: Manual copy-paste</h4>
        <p className="text-sm text-foreground/80 mb-3">
          If you prefer to post directly from LinkedIn, copy your content from the editor, paste
          it into a new LinkedIn post, then come back and select{" "}
          <strong>&quot;Manually Posted&quot;</strong> from the 3-dot Actions menu so PostPilot
          tracks it as published. You can paste the LinkedIn post URL when prompted so analytics
          can match it back.
        </p>

        <h4 className="text-sm font-semibold">Post images</h4>
        <p className="text-sm text-foreground/80 mb-3">
          You can upload an image or generate one with AI before publishing. All images are saved
          as versions, so you can switch between previous images at any time using the
          <strong> image history strip</strong> below the image preview in the editor or the
          publish preview dialog.
        </p>

        <Tip>
          LinkedIn posting is connected automatically after your first login. If the connection
          is lost, a banner appears at the top of every page with a Reconnect button. If a
          scheduled post couldn&apos;t publish (e.g. because the connection had expired), you&apos;ll
          see a separate past-due banner that links to <strong>/posts/recovery</strong>, where you
          can review failed posts and republish or reschedule them once you&apos;re reconnected.
        </Tip>
      </CollapsibleCard>

      </section>

      {/* ─── Content Tools ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Content Tools</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Build a library of reusable content to speed up your writing.
        </p>
      </div>

      <CollapsibleCard
        title="Content Library"
        description="Save and reuse your best hooks, CTAs, closings, and snippets"
        defaultOpen={false}
      >
        <HelpPaidBadge tier="professional" />
        <p id="content-library" className="text-sm text-foreground/80 mb-3">
          The Content Library lets you save pieces of content you use frequently and insert them into
          any post with one click.
        </p>

        <h4 className="text-sm font-semibold">Content types</h4>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            <strong>Hooks</strong> - Opening lines designed to stop readers from scrolling and
            make them click &quot;see more.&quot;
          </li>
          <li>
            <strong>CTAs (Calls-to-Action)</strong> - Phrases that encourage readers to engage,
            comment, share, or take a next step.
          </li>
          <li>
            <strong>Closings</strong> - Closing lines that wrap up your post with impact and
            leave a lasting impression.
          </li>
          <li>
            <strong>Snippets</strong> - Reusable text blocks like quotes, statistics,
            transitions, or any content you use often.
          </li>
        </ul>

        <h4 className="text-sm font-semibold mt-4">How to save and insert</h4>
        <StepList>
          <li>
            <strong>Save from the editor:</strong> Select text in your post, click the{" "}
            <strong>bookmark icon</strong> in the editor toolbar (tooltip:{" "}
            <strong>&quot;Save to Library&quot;</strong>), then choose a type and give it a name.
          </li>
          <li>
            <strong>Save from the Library page:</strong> Click <strong>&quot;Add to
            Library&quot;</strong> and paste your content directly.
          </li>
          <li>
            <strong>Reuse saved content:</strong> Open the <strong>Library</strong> page from the
            sidebar to browse, filter, and copy any saved item, then paste it into your post.
          </li>
        </StepList>

        <Tip>
          The Library page shows a usage count for each item, so you can track which content pieces
          you rely on most.
        </Tip>
      </CollapsibleCard>

      {/* Post Templates help section — suppressed until GTM. Restore the
          full <CollapsibleCard> block when POST_TEMPLATES_ENABLED flips. */}
      {POST_TEMPLATES_ENABLED && (
        <CollapsibleCard
          title="Post Templates"
          description="Use built-in templates or save your own post structures"
          defaultOpen={false}
        >
          <HelpPaidBadge tier="professional" />
          <p id="templates" className="text-sm text-foreground/80 mb-3">
            Templates give you a head start on common post formats so you don&apos;t have to start
            from a blank page every time.
          </p>

          <h4 className="text-sm font-semibold">Using templates</h4>
          <StepList>
            <li>
              When creating a new post, you&apos;ll see a <strong>template picker</strong> with
              built-in formats like Listicles, Story Posts, Hot Takes, and more.
            </li>
            <li>
              Click a template to pre-fill your post editor with a proven structure. Replace the
              placeholder text with your own content.
            </li>
            <li>
              To <strong>save your own template</strong>, write a post you want to reuse as a
              structure, then use the <strong>&quot;Save as Template&quot;</strong> option from the
              editor menu.
            </li>
          </StepList>

          <Tip>
            Templates preserve the structure but not the specific content, so you can reuse the same
            format across different topics.
          </Tip>
        </CollapsibleCard>
      )}

      </section>

      {/* ─── Post Pilot AI ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 id="ai-assistant" className="text-lg font-semibold">Post Pilot AI</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Post Pilot AI helps you draft, refine, and improve your LinkedIn posts using your
          personal voice and style.
        </p>
      </div>

      <CollapsibleCard
        title="Using Post Pilot AI"
        description="Voice profiles, quick suggestions, and applying AI drafts"
        defaultOpen={false}
      >
        <h4 className="text-sm font-semibold">How AI uses your voice profile</h4>
        <p className="text-sm text-foreground/80 mb-3">
          When you set up your User Profile, the AI learns your writing style, tone,
          expertise, and target audience. Every AI-generated draft is tailored to sound like you,
          not generic LinkedIn content. The AI also has full context of your current post, including
          title, content, status, and content pillar.
        </p>

        <h4 className="text-sm font-semibold">Quick suggestions vs. free-form chat</h4>
        <p className="text-sm text-foreground/80 mb-3">
          The AI panel shows <strong>quick suggestion chips</strong> like &quot;Add a hook,&quot;
          &quot;Make it shorter,&quot; or &quot;Add a CTA&quot; for common requests. Click one to
          get an instant improvement. You can also type any free-form instruction in the chat
          input for more specific requests.
        </p>

        <h4 id="hook-analysis" className="text-sm font-semibold">Hook analysis</h4>
        <HelpPaidBadge tier="personal" />
        <p className="text-sm text-foreground/80 mb-3">
          PostPilot focuses on the first ~210 characters of your post — the portion LinkedIn
          shows before the <em>&quot;see more&quot;</em> link. To rework your opening, type{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/hook</code> in the editor to
          rewrite the first line, or open the Post Pilot AI panel and ask it to score and improve
          your hook. The AI considers proven techniques (questions, bold claims, contrarian
          openers, story leads) and tailors suggestions to your voice profile.
        </p>

        <h4 className="text-sm font-semibold">Applying AI drafts</h4>
        <p className="text-sm text-foreground/80 mb-3">
          When the AI generates content, click the <strong>&quot;Apply to Editor&quot;</strong> button
          on the message to replace your editor content with the AI draft. Your previous version is
          auto-saved, so you can always undo the change.
        </p>

        <Tip>
          The better your User Profile, the more personalized and on-brand the AI output will be.
          Take time to fill in your expertise, tone, and example posts in Settings.
        </Tip>
      </CollapsibleCard>

      </section>

      {/* ─── Scheduling & Calendar ─── */}
      <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 id="scheduling" className="text-lg font-semibold">Scheduling &amp; Calendar</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Plan your content calendar and let PostPilot publish your posts at the right time.
        </p>
      </div>

      <CollapsibleCard
        title="How Scheduling Works"
        description="Schedule, reschedule, and manage your publishing calendar"
        defaultOpen={false}
      >
        <h4 className="text-sm font-semibold">Scheduling a post</h4>
        <p className="text-sm text-foreground/80 mb-3">
          When you schedule a post, it is <strong>not</strong> published immediately. It is saved
          with a future date and time, and PostPilot will automatically publish it to LinkedIn at
          the scheduled moment. Until then, you can continue editing or reschedule it.
        </p>

        <h4 className="text-sm font-semibold">Rescheduling</h4>
        <StepList>
          <li>
            Open the scheduled post in the editor and choose{" "}
            <strong>&quot;Schedule Post&quot;</strong> from the 3-dot Actions menu (or use the
            Schedule button next to it) to pick a new date and time.
          </li>
          <li>
            You can also reschedule from the <strong>Calendar page</strong> or the{" "}
            <strong>Posts page</strong> using the Reschedule button on upcoming post cards.
          </li>
          <li>
            To postpone indefinitely, open the post and use the{" "}
            <strong>3-dot Actions menu</strong> to archive it. You can restore it any time and
            re-schedule from the editor.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Calendar views</h4>
        <p className="text-sm text-foreground/80 mb-3">
          The Calendar page shows all your scheduled posts across three views:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            <strong>Month view</strong> - See all scheduled posts for the entire month at a
            glance. Hover over any post to see a preview. Great for spotting gaps in your calendar.
          </li>
          <li>
            <strong>Week view</strong> - See scheduled posts for the current week with more
            detail including post images.
          </li>
          <li>
            <strong>Day view</strong> - See all posts scheduled for a specific day with hourly
            timeslots.
          </li>
        </ul>

        <Tip>
          Posts that miss their scheduled publish time (e.g., if there was a connection issue)
          appear as &quot;Past Due&quot; on the Posts page and on the dedicated{" "}
          <strong>/posts/recovery</strong> page, where you can quickly reconnect LinkedIn,
          republish, or reschedule them.
        </Tip>
      </CollapsibleCard>
      </section>
    </div>
  );
}
