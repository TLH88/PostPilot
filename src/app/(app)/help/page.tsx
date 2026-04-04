import { HelpCircle, ExternalLink, AlertTriangle, CreditCard, BarChart3 } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";

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

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Never share your API keys publicly or commit them to version control. PostPilot encrypts
          your key with AES-256-GCM and only uses it server-side.
        </p>
      </div>

      {/* ─── Anthropic ─── */}
      <CollapsibleCard
        title="Anthropic (Claude)"
        description="Claude Opus, Sonnet, and Haiku models"
        defaultOpen={false}
      >
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
            Copy the key immediately &mdash; it starts with{" "}
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
          <strong>not</strong> include API credits &mdash; they must be purchased separately.
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
            Google Cloud project &mdash; the default project is fine for getting started.
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

      {/* ─── LinkedIn Analytics Import ─── */}
      <div className="space-y-2 pt-4">
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
        <p className="text-sm text-foreground/80 mb-3">
          LinkedIn provides analytics on your post performance including impressions and engagements.
          You can import this data into PostPilot in two passes &mdash; one for impressions and one for
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
    </div>
  );
}
