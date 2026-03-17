"use client";

import { ExternalLink, CreditCard, HelpCircle, AlertTriangle } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

function StepList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-foreground/90">
      {children}
    </ol>
  );
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
        <strong>Billing note:</strong> {provider} may require you to purchase
        API credits in addition to any standalone subscription you may have. API
        usage is typically billed separately from consumer products.
      </p>
    </div>
  );
}

function ExtUrl({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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

interface APIKeyHelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function APIKeyHelpDrawer({ open, onOpenChange }: APIKeyHelpDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            API Key Help
          </SheetTitle>
          <SheetDescription>
            Step-by-step guides for creating API keys with each supported
            provider.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {/* Security note */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Never share your API keys publicly. PostPilot encrypts your key
              with AES-256-GCM and only uses it server-side.
            </p>
          </div>

          {/* Anthropic */}
          <CollapsibleCard
            title="Anthropic (Claude)"
            description="Claude Opus, Sonnet, and Haiku"
            defaultOpen={false}
          >
            <BillingNote provider="Anthropic" />
            <h4 className="text-sm font-semibold">Creating a new API key</h4>
            <StepList>
              <li>
                Go to{" "}
                <ExtUrl href="https://console.anthropic.com">
                  console.anthropic.com
                </ExtUrl>{" "}
                and sign up or log in.
              </li>
              <li>
                Click <strong>API Keys</strong> in the left sidebar, or go to{" "}
                <ExtUrl href="https://console.anthropic.com/settings/keys">
                  Settings &rarr; Keys
                </ExtUrl>
                .
              </li>
              <li>
                Click <strong>&quot;Create Key&quot;</strong>, name it (e.g.
                &quot;PostPilot&quot;), and click <strong>Create Key</strong>.
              </li>
              <li>
                Copy the key immediately (starts with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  sk-ant-
                </code>
                ) and paste it into PostPilot.
              </li>
            </StepList>
            <Tip>
              Set spending limits under <strong>Settings &rarr; Limits</strong>{" "}
              in the Anthropic Console to prevent unexpected charges.
            </Tip>
          </CollapsibleCard>

          {/* OpenAI */}
          <CollapsibleCard
            title="OpenAI (GPT / o-series)"
            description="GPT-4.1, GPT-4o, o3, and o4-mini"
            defaultOpen={false}
          >
            <BillingNote provider="OpenAI" />
            <h4 className="text-sm font-semibold">Creating a new API key</h4>
            <StepList>
              <li>
                Go to{" "}
                <ExtUrl href="https://platform.openai.com">
                  platform.openai.com
                </ExtUrl>{" "}
                and sign up or log in.
              </li>
              <li>
                Navigate to{" "}
                <ExtUrl href="https://platform.openai.com/api-keys">
                  API Keys
                </ExtUrl>{" "}
                from your profile menu.
              </li>
              <li>
                Click <strong>&quot;Create new secret key&quot;</strong>, name it,
                and click <strong>Create secret key</strong>.
              </li>
              <li>
                Copy the key (starts with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  sk-
                </code>
                ) and paste it into PostPilot.
              </li>
            </StepList>
            <Tip>
              A ChatGPT Plus subscription does <strong>not</strong> include API
              credits. Purchase them separately under{" "}
              <strong>Settings &rarr; Billing</strong>.
            </Tip>
          </CollapsibleCard>

          {/* Google */}
          <CollapsibleCard
            title="Google (Gemini)"
            description="Gemini 2.5 Pro, Flash, and Flash Lite"
            defaultOpen={false}
          >
            <BillingNote provider="Google" />
            <h4 className="text-sm font-semibold">Creating a new API key</h4>
            <StepList>
              <li>
                Go to{" "}
                <ExtUrl href="https://aistudio.google.com">
                  aistudio.google.com
                </ExtUrl>{" "}
                and sign in.
              </li>
              <li>
                Click <strong>&quot;Get API key&quot;</strong> in the sidebar, or
                go to{" "}
                <ExtUrl href="https://aistudio.google.com/apikey">
                  API Key page
                </ExtUrl>
                .
              </li>
              <li>
                Click <strong>&quot;Create API key&quot;</strong> and select a
                Google Cloud project.
              </li>
              <li>
                Copy the key (starts with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  AIza
                </code>
                ) and paste it into PostPilot.
              </li>
            </StepList>
            <Tip>
              Google offers a generous free tier that may be sufficient for
              moderate usage. Check the{" "}
              <ExtUrl href="https://ai.google.dev/pricing">pricing page</ExtUrl>{" "}
              for current limits.
            </Tip>
          </CollapsibleCard>

          {/* Perplexity */}
          <CollapsibleCard
            title="Perplexity (Sonar)"
            description="Sonar Pro, Reasoning, and Deep Research"
            defaultOpen={false}
          >
            <BillingNote provider="Perplexity" />
            <h4 className="text-sm font-semibold">Creating a new API key</h4>
            <StepList>
              <li>
                Go to{" "}
                <ExtUrl href="https://www.perplexity.ai/settings/api">
                  perplexity.ai/settings/api
                </ExtUrl>{" "}
                and sign in.
              </li>
              <li>
                Scroll to the <strong>API Keys</strong> section.
              </li>
              <li>
                Click <strong>&quot;Generate&quot;</strong> to create a new key.
              </li>
              <li>
                Copy the key (starts with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  pplx-
                </code>
                ) and paste it into PostPilot.
              </li>
            </StepList>
            <Tip>
              A Perplexity Pro subscription does <strong>not</strong> include API
              credits. Sonar models include built-in web search, making them
              great for trending topics.
            </Tip>
          </CollapsibleCard>
        </div>
      </SheetContent>
    </Sheet>
  );
}
