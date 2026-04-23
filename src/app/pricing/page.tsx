"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Send, Check, X, Sparkles, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TIER_FEATURES, SUBSCRIPTION_TIERS, TRIAL_COOLDOWN_DAYS, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const TIER_ORDER: SubscriptionTier[] = ["free", "creator", "professional", "team"];
const ALL_TIERS: SubscriptionTier[] = ["free", "creator", "professional", "team", "enterprise"];
const TRIABLE_TIERS = new Set(["creator", "professional"]);

const TIER_STYLE: Record<string, { highlight: boolean; badge?: string; border: string }> = {
  free: { highlight: false, border: "border-border" },
  creator: { highlight: true, badge: "Most Popular", border: "border-primary" },
  professional: { highlight: false, border: "border-border" },
  team: { highlight: false, border: "border-border" },
  enterprise: { highlight: false, border: "border-border" },
};

// Annual = monthly × 12 × 0.85 (15% discount)
const ANNUAL_PRICES: Record<string, string | null> = {
  free: null,
  creator: "$204/yr",
  professional: "$510/yr",
  team: "$1,020/yr",
  enterprise: null,
};

const TIER_RANK: Record<string, number> = { free: 0, creator: 1, professional: 2, team: 3, enterprise: 4 };

const FAQ = [
  {
    q: "What is BYOK (Bring Your Own Key)?",
    a: "BYOK means bringing your own AI provider API key (OpenAI, Anthropic, Google, or Perplexity). On the Professional and Team plans, connecting a key unlocks unlimited AI usage and full model choice — you control costs and your data stays between you and your provider. Free and Personal plans use PostPilot's built-in AI with tier-specific monthly quotas.",
  },
  {
    q: "Which AI providers are supported?",
    a: "PostPilot supports Anthropic (Claude), OpenAI (GPT and image models), Google (Gemini), and Perplexity (Sonar). Professional and Team subscribers with BYOK can switch providers any time from Settings. Free and Personal tiers run on PostPilot's built-in models.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. You can upgrade or downgrade your plan at any time from Settings. Changes take effect immediately. When downgrading, you keep your existing content but gated features will show upgrade prompts.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! Free and Personal plans include a 14-day free trial with full access to all Professional tier features. No credit card required to start your trial.",
  },
  {
    q: "How does billing work?",
    a: "Billing is handled securely via Stripe. You can choose monthly or annual billing (15% off with annual). Manage your subscription, update payment methods, and view invoices from your account settings.",
  },
];

interface UserState {
  loggedIn: boolean;
  currentTier: SubscriptionTier;
  accountStatus: string;
  trialTier: string | null;
  lastTrialTiers: Record<string, string>;
}

export default function PricingPage() {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    return () => {
      if (previousTheme) setTheme(previousTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if user is logged in and get their tier/trial state
  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserState({ loggedIn: false, currentTier: "free", accountStatus: "active", trialTier: null, lastTrialTiers: {} });
        return;
      }

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("subscription_tier, account_status, trial_tier, last_trial_tiers")
        .eq("user_id", user.id)
        .single();

      setUserState({
        loggedIn: true,
        currentTier: (profile?.subscription_tier ?? "free") as SubscriptionTier,
        accountStatus: profile?.account_status ?? "active",
        trialTier: profile?.trial_tier ?? null,
        lastTrialTiers: (profile?.last_trial_tiers as Record<string, string>) ?? {},
      });
    }
    checkUser();
  }, []);

  function canTrialTier(tierKey: string): boolean {
    if (!userState?.loggedIn) return true; // not logged in — will redirect to signup
    if (!TRIABLE_TIERS.has(tierKey)) return false;
    const lastDate = userState.lastTrialTiers[tierKey];
    if (!lastDate) return true;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
    return daysSince >= TRIAL_COOLDOWN_DAYS;
  }

  function getButtonConfig(tierKey: string): { label: string; action: () => void; variant: "primary" | "disabled" } {
    // Standard theme: all action buttons are primary (blue/white). Non-clickable
    // states ("Current Plan" etc.) use a disabled style so users can still tell
    // the button is inactive.

    // Free tier
    if (tierKey === "free") {
      if (userState?.loggedIn && userState.currentTier === "free") {
        return { label: "Current Plan", action: () => {}, variant: "disabled" };
      }
      return { label: "Get Started", action: () => router.push("/signup"), variant: "primary" };
    }

    // Team — admin managed
    if (tierKey === "team") {
      return { label: "Contact Sales", action: () => router.push("mailto:sales@mypostpilot.app"), variant: "primary" };
    }

    // Not logged in
    if (!userState?.loggedIn) {
      return { label: "Start Free Trial", action: () => router.push(`/signup?tier=${tierKey}`), variant: "primary" };
    }

    // Already on this tier (active or trialing)
    if (userState.currentTier === tierKey) {
      if (userState.accountStatus === "trial") {
        return { label: "Currently Trialing", action: () => {}, variant: "disabled" };
      }
      return { label: "Current Plan", action: () => {}, variant: "disabled" };
    }

    // On a higher tier already
    if (TIER_RANK[userState.currentTier] >= TIER_RANK[tierKey]) {
      return { label: "Current plan is higher", action: () => {}, variant: "disabled" };
    }

    // Can trial this tier
    if (canTrialTier(tierKey)) {
      return {
        label: "Start Free Trial",
        action: () => startTrial(tierKey),
        variant: "primary",
      };
    }

    // Already trialed — show Upgrade
    return {
      label: "Upgrade",
      action: () => { toast.info("Stripe billing coming soon. Contact support to upgrade."); },
      variant: "primary",
    };
  }

  async function startTrial(tier: string) {
    setStarting(tier);
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "trial_unavailable") {
          toast.error("Trial not available for this tier. Please upgrade instead.");
        } else {
          toast.error(data.error || "Failed to start trial");
        }
        return;
      }

      toast.success(`Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} trial has started! You have ${data.days} days of full access.`);
      router.push("/dashboard");
    } catch {
      toast.error("Failed to start trial");
    } finally {
      setStarting(null);
    }
  }

  function renderValue(val: boolean | string) {
    if (val === true) return <Check className="size-4 text-green-600" />;
    if (val === false) return <X className="size-4 text-muted-foreground/40" />;
    return <span className="text-sm">{val}</span>;
  }

  /**
   * Feature row inside a pricing card. Keeps a consistent 3-column grid so
   * rows line up across tiers at a glance:
   *   [✓/✗ icon (16px)] [feature name, flex-1] [optional value, right-aligned]
   * Booleans render as icon-only; quantitative/string values render with
   * a ✓ icon AND the value text on the right.
   */
  function renderCardRow(feature: typeof TIER_FEATURES[number], tierKey: SubscriptionTier) {
    const val = feature[tierKey as keyof typeof feature];
    const available = val !== false;
    const hasValueText = typeof val === "string";
    return (
      <div
        key={feature.key}
        className={cn(
          "flex items-center gap-2.5 text-sm",
          !available && "text-muted-foreground/50"
        )}
      >
        <div className="shrink-0 w-4">
          {available ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <X className="size-4 text-muted-foreground/40" />
          )}
        </div>
        <span className="flex-1 min-w-0">{feature.name}</span>
        {hasValueText && (
          <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
            {val}
          </span>
        )}
      </div>
    );
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
            {userState?.loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Dashboard
              </Link>
            ) : (
              <>
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
              </>
            )}
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
              Start free. Upgrade when you&apos;re ready for more.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid gap-6 lg:grid-cols-4">
            {TIER_ORDER.map((tierKey) => {
              const tier = SUBSCRIPTION_TIERS[tierKey];
              const style = TIER_STYLE[tierKey];
              const annual = ANNUAL_PRICES[tierKey];
              const btn = getButtonConfig(tierKey);
              const isStarting = starting === tierKey;
              const isDisabled = btn.label === "Current Plan" || btn.label === "Currently Trialing" || btn.label === "Current plan is higher" || isStarting;

              return (
                <Card
                  key={tierKey}
                  className={cn(
                    "relative flex flex-col overflow-visible",
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
                      {tierKey === "free" && (
                        <>
                          <span className="text-4xl font-bold">$0</span>
                          <span className="text-muted-foreground"> forever</span>
                        </>
                      )}
                      {tierKey === "creator" && (
                        <>
                          <span className="text-4xl font-bold">$20</span>
                          <span className="text-muted-foreground">/mo</span>
                        </>
                      )}
                      {tierKey === "professional" && (
                        <>
                          <span className="text-4xl font-bold">$50</span>
                          <span className="text-muted-foreground">/mo</span>
                        </>
                      )}
                      {tierKey === "team" && (
                        <>
                          <span className="text-4xl font-bold">$100</span>
                          <span className="text-muted-foreground">/mo</span>
                          <p className="text-sm text-muted-foreground mt-0.5">+ $6 per user</p>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground h-4">
                      {annual ? `or ${annual} (save 15%)` : "\u00A0"}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <button
                      onClick={btn.action}
                      disabled={isDisabled}
                      className={cn(
                        "mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
                      )}
                    >
                      {isStarting && <Loader2 className="size-3.5 animate-spin" />}
                      {btn.label}
                    </button>

                    <Separator className="my-5" />

                    {/* Feature list */}
                    <div className="flex-1 space-y-3">
                      {TIER_FEATURES.map((feature) => renderCardRow(feature, tierKey))}
                    </div>

                    {tierKey === "professional" && (
                      <p className="mt-5 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        <Sparkles className="mr-1 inline-block size-3 align-text-bottom text-primary" />
                        Bring your own AI key (BYOK) to unlock unlimited usage on every
                        quota above.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enterprise card */}
          <div className="mt-8 mx-auto max-w-2xl">
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enterprise</h3>
                  <span className="text-lg font-bold text-muted-foreground">Custom Pricing</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">150+ users — everything in Team with dedicated support, custom integrations, SSO, and SLA guarantees</p>
              </CardHeader>
              <CardContent>
                <Link
                  href="mailto:sales@mypostpilot.app"
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Contact Sales
                </Link>
              </CardContent>
            </Card>
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
                    {ALL_TIERS.map((t) => (
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
                      {ALL_TIERS.map((t) => (
                        <td key={t} className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            {renderValue(feature[t as keyof typeof feature])}
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

        {/* AI Access Highlight */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">AI that fits your plan</h2>
            <p className="mt-3 text-muted-foreground">
              Free and Personal plans run on PostPilot&apos;s built-in AI models — no setup,
              no API keys, just sensible monthly quotas. Upgrade to Professional or Team to
              bring your own AI provider key (OpenAI, Claude, Gemini, or Perplexity) and
              unlock unlimited usage with full model choice.
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
