import { HelpCircle, ExternalLink, AlertTriangle, CreditCard, BarChart3, Lightbulb, BookOpen, Bot, CalendarDays } from "lucide-react";
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

      {/* ─── Getting Started ─── */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          <h2 id="getting-started" className="text-lg font-semibold">Getting Started</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          New to PostPilot? These guides walk you through the core workflow from brainstorming ideas
          to publishing on LinkedIn.
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
            expertise.
          </li>
          <li>
            Review the generated ideas. Each idea has a <strong>temperature badge</strong> &mdash;
            Hot (timely, trend-driven), Warm (solid evergreen), or Cold (niche deep-dives) &mdash;
            to help you prioritize.
          </li>
          <li>
            <strong>Edit</strong> any idea to refine its title, description, or temperature.
            <strong> Archive</strong> ideas you want to save for later.
          </li>
          <li>
            When you&apos;re ready, click <strong>&quot;Develop&quot;</strong> to turn an idea into
            a post draft. This creates a new post in your editor pre-filled with the idea title.
          </li>
        </StepList>

        <Tip>
          You can also add ideas manually without AI. Use the Idea Bank as a running list of content
          topics so you never run out of things to write about.
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
            Bank. The editor opens with a blank canvas (or your idea title if developed from an idea).
          </li>
          <li>
            Write your content in the main text area. The character counter at the bottom shows
            your post length &mdash; LinkedIn allows up to 3,000 characters.
          </li>
          <li>
            Use the <strong>Format</strong> menu to insert line breaks, bullet points, analyze your
            hook, or save sections to your Content Library.
          </li>
          <li>
            Click <strong>&quot;Show AI&quot;</strong> to open the AI Assistant panel. Ask the AI to
            help you draft, refine, or improve your post. Use the quick suggestion chips for common
            requests.
          </li>
          <li>
            Add hashtags using the hashtag section below the editor. Hashtags are appended to your
            post when publishing.
          </li>
        </StepList>

        <Tip>
          Your post auto-saves as you type. Look for the cloud icon in the header to confirm your
          changes are saved.
        </Tip>
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
          If you&apos;ve connected your LinkedIn account in Settings, you can publish directly from
          PostPilot. Click <strong>&quot;Publish to LinkedIn&quot;</strong> in the editor to send
          your post immediately. You can also schedule it for a future date and time.
        </p>

        <h4 className="text-sm font-semibold">Option 2: Schedule for later</h4>
        <p className="text-sm text-foreground/80 mb-3">
          Click <strong>&quot;Schedule&quot;</strong> to set a specific date and time. Your post will
          be automatically published at the scheduled time &mdash; it is <strong>not</strong> published
          immediately when you schedule it.
        </p>

        <h4 className="text-sm font-semibold">Option 3: Manual copy-paste</h4>
        <p className="text-sm text-foreground/80 mb-3">
          Use the <strong>&quot;Copy Post&quot;</strong> button in the Format menu to copy your post
          content and hashtags to your clipboard. Then open LinkedIn and paste it into a new post.
          After pasting, come back and click <strong>&quot;Mark as Posted&quot;</strong> so PostPilot
          tracks it as published.
        </p>

        <Tip>
          Direct publish requires connecting your LinkedIn account under Settings. The connection
          uses OAuth and does not store your LinkedIn password.
        </Tip>
      </CollapsibleCard>

      {/* ─── Content Tools ─── */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Content Tools</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Build a library of reusable content and leverage templates to speed up your writing.
        </p>
      </div>

      <CollapsibleCard
        title="Content Library"
        description="Save and reuse your best hooks, CTAs, closings, and snippets"
        defaultOpen={false}
      >
        <p id="content-library" className="text-sm text-foreground/80 mb-3">
          The Content Library lets you save pieces of content you use frequently and insert them into
          any post with one click.
        </p>

        <h4 className="text-sm font-semibold">Content types</h4>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            <strong>Hooks</strong> &mdash; Opening lines designed to stop readers from scrolling and
            make them click &quot;see more.&quot;
          </li>
          <li>
            <strong>CTAs (Calls-to-Action)</strong> &mdash; Phrases that encourage readers to engage,
            comment, share, or take a next step.
          </li>
          <li>
            <strong>Closings</strong> &mdash; Closing lines that wrap up your post with impact and
            leave a lasting impression.
          </li>
          <li>
            <strong>Snippets</strong> &mdash; Reusable text blocks like quotes, statistics,
            transitions, or any content you use often.
          </li>
        </ul>

        <h4 className="text-sm font-semibold mt-4">How to save and insert</h4>
        <StepList>
          <li>
            <strong>Save from the editor:</strong> Select text in your post, click
            the <strong>Format</strong> menu, then <strong>&quot;Save to Library.&quot;</strong> Choose
            a type and give it a name.
          </li>
          <li>
            <strong>Save from the Library page:</strong> Click <strong>&quot;Add to
            Library&quot;</strong> and paste your content directly.
          </li>
          <li>
            <strong>Insert into a post:</strong> In the editor, click the <strong>&quot;Insert from
            Library&quot;</strong> button next to the Format menu. Browse or filter your saved items
            and click to insert.
          </li>
        </StepList>

        <Tip>
          The Library page shows a usage count for each item, so you can track which content pieces
          you rely on most.
        </Tip>
      </CollapsibleCard>

      <CollapsibleCard
        title="Post Templates"
        description="Use built-in templates or save your own post structures"
        defaultOpen={false}
      >
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

      {/* ─── AI Assistant ─── */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 id="ai-assistant" className="text-lg font-semibold">AI Assistant</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The AI Assistant helps you draft, refine, and improve your LinkedIn posts using your
          personal voice and style.
        </p>
      </div>

      <CollapsibleCard
        title="Using the AI Assistant"
        description="Voice profiles, quick suggestions, and applying AI drafts"
        defaultOpen={false}
      >
        <h4 className="text-sm font-semibold">How AI uses your voice profile</h4>
        <p className="text-sm text-foreground/80 mb-3">
          When you set up your Creator Profile in Settings, the AI learns your writing style, tone,
          expertise, and target audience. Every AI-generated draft is tailored to sound like you
          &mdash; not generic LinkedIn content.
        </p>

        <h4 className="text-sm font-semibold">Quick suggestions vs. free-form chat</h4>
        <p className="text-sm text-foreground/80 mb-3">
          The AI panel shows <strong>quick suggestion chips</strong> like &quot;Add a hook,&quot;
          &quot;Make it shorter,&quot; or &quot;Add a CTA&quot; for common requests. Click one to
          get an instant improvement. You can also type any free-form instruction in the chat
          input for more specific requests.
        </p>

        <h4 id="hook-analysis" className="text-sm font-semibold">Hook analysis</h4>
        <p className="text-sm text-foreground/80 mb-3">
          The <strong>&quot;Analyze Hook&quot;</strong> feature in the Format menu evaluates your
          post&apos;s opening lines (the first ~210 characters visible before LinkedIn&apos;s
          &quot;see more&quot; link). It scores your hook, identifies the technique used, and
          suggests improvements.
        </p>

        <h4 className="text-sm font-semibold">Applying AI drafts</h4>
        <p className="text-sm text-foreground/80 mb-3">
          When the AI generates content, click the <strong>&quot;Apply to Editor&quot;</strong> button
          on the message to replace your editor content with the AI draft. Your previous version is
          auto-saved, so you can always undo the change.
        </p>

        <Tip>
          The better your Creator Profile, the more personalized and on-brand the AI output will be.
          Take time to fill in your expertise, tone, and example posts in Settings.
        </Tip>
      </CollapsibleCard>

      {/* ─── Scheduling & Calendar ─── */}
      <div className="space-y-2 pt-4">
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
            Open the scheduled post in the editor or find it on the Posts page.
          </li>
          <li>
            Click <strong>&quot;Reschedule&quot;</strong> to pick a new date and time.
          </li>
          <li>
            You can also move it back to draft status if you want to postpone indefinitely.
          </li>
        </StepList>

        <h4 className="text-sm font-semibold">Calendar views</h4>
        <p className="text-sm text-foreground/80 mb-3">
          The Calendar page shows all your scheduled posts across three views:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            <strong>Month view</strong> &mdash; See all scheduled posts for the entire month at a
            glance. Great for spotting gaps in your content calendar.
          </li>
          <li>
            <strong>Week view</strong> &mdash; See scheduled posts for the current week with more
            detail and easier drag-to-reschedule.
          </li>
          <li>
            <strong>Day view</strong> &mdash; See all posts scheduled for a specific day with hourly
            timeslots.
          </li>
        </ul>

        <Tip>
          Posts that miss their scheduled publish time (e.g., if there was a connection issue) appear
          as &quot;Past Due&quot; on the Posts page so you can quickly republish or reschedule them.
        </Tip>
      </CollapsibleCard>
    </div>
  );
}
