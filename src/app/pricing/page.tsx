"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Send, Check, X, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TIER_FEATURES, SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TIER_ORDER: SubscriptionTier[] = ["free", "creator", "professional"];

const TIER_STYLE: Record<SubscriptionTier, { highlight: boolean; badge?: string; border: string }> = {
  free: { highlight: false, border: "border-border" },
  creator: { highlight: true, badge: "Most Popular", border: "border-primary" },
  professional: { highlight: false, border: "border-border" },
};

const ANNUAL_PRICES: Record<SubscriptionTier, string | null> = {
  free: null,
  creator: "$190/yr",
  professional: "$490/yr",
};

const FAQ = [
  {
    q: "What is BYOK (Bring Your Own Key)?",
    a: "PostPilot uses your own AI provider API key (OpenAI, Anthropic, Google, or Perplexity) for all AI features. This means you control your costs, choose your preferred AI model, and your data stays between you and your provider. PostPilot never charges for AI usage.",
  },
  {
    q: "Which AI providers are supported?",
    a: "PostPilot supports Anthropic (Claude), OpenAI (GPT-4, DALL-E), Google (Gemini), and Perplexity (Sonar). You can switch providers at any time from Settings.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. You can upgrade or downgrade your plan at any time from Settings. Changes take effect immediately. When downgrading, you keep access to your existing content but gated features will show upgrade prompts.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever with generous limits. You can explore all core features before deciding to upgrade. No credit card required to get started.",
  },
  {
    q: "How does billing work?",
    a: "Billing is handled securely via Stripe. You can choose monthly or annual billing (17% off with annual). Manage your subscription, update payment methods, and view invoices from your account settings.",
  },
];

export default function PricingPage() {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    return () => {
      if (previousTheme) setTheme(previousTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderValue(val: boolean | string) {
    if (val === true) return <Check className="size-4 text-green-600" />;
    if (val === false) return <X className="size-4 text-muted-foreground/40" />;
    return <span className="text-sm">{val}</span>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">PostPilot</span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you need more power. All plans include your choice of AI provider.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {TIER_ORDER.map((tierKey) => {
              const tier = SUBSCRIPTION_TIERS[tierKey];
              const style = TIER_STYLE[tierKey];
              const annual = ANNUAL_PRICES[tierKey];

              return (
                <Card
                  key={tierKey}
                  className={cn(
                    "relative flex flex-col",
                    style.highlight && "border-2 border-primary shadow-lg"
                  )}
                >
                  {style.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                        {style.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <h3 className="text-lg font-semibold">{tier.label}</h3>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">
                        {tierKey === "free" ? "$0" : `$${tierKey === "creator" ? "19" : "49"}`}
                      </span>
                      <span className="text-muted-foreground">
                        {tierKey === "free" ? " forever" : "/mo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground h-4">
                      {annual ? `or ${annual} (save 17%)` : "\u00A0"}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <Link
                      href="/signup"
                      className={cn(
                        "mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors",
                        style.highlight
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-input bg-background hover:bg-muted"
                      )}
                    >
                      {tierKey === "free" ? "Get Started" : "Start Free Trial"}
                    </Link>

                    <Separator className="my-5" />

                    {/* Feature list */}
                    <div className="flex-1 space-y-3">
                      {TIER_FEATURES.map((feature) => {
                        const val = feature[tierKey];
                        const available = val !== false;
                        return (
                          <div
                            key={feature.key}
                            className={cn(
                              "flex items-center gap-2.5 text-sm",
                              !available && "text-muted-foreground/50"
                            )}
                          >
                            <div className="shrink-0">
                              {renderValue(val)}
                            </div>
                            <span>{feature.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Feature Comparison Table (desktop) */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mb-8 text-center text-2xl font-semibold">
              Compare all features
            </h2>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 pr-4 text-left font-medium text-muted-foreground">Feature</th>
                    {TIER_ORDER.map((t) => (
                      <th key={t} className="pb-3 px-4 text-center font-semibold">
                        {SUBSCRIPTION_TIERS[t].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIER_FEATURES.map((feature) => (
                    <tr key={feature.key} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{feature.name}</td>
                      {TIER_ORDER.map((t) => (
                        <td key={t} className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            {renderValue(feature[t])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* BYOK Highlight */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Your AI, your provider, your data</h2>
            <p className="mt-3 text-muted-foreground">
              PostPilot uses your own AI API key — we never charge for AI usage. You choose
              your provider (OpenAI, Claude, Gemini, or Perplexity), control your costs, and
              your content stays between you and your AI provider.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-8 text-center text-2xl font-semibold">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-lg border bg-background p-5">
                  <h3 className="text-sm font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-semibold">
              Ready to create better LinkedIn content?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Start with the free plan — no credit card required.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Create your free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Send className="size-3.5 text-primary" />
            <span>PostPilot</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PostPilot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
