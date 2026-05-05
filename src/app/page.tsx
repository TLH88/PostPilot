"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Lightbulb, FileText, Calendar, Send } from "lucide-react";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { ScreenshotCarousel } from "@/components/landing/screenshot-carousel";

const features = [
  {
    icon: Lightbulb,
    title: "Brainstorm Ideas",
    description:
      "Generate compelling content ideas tailored to your industry, audience, and goals with AI-powered brainstorming.",
  },
  {
    icon: FileText,
    title: "Draft Posts",
    description:
      "Transform rough ideas into polished LinkedIn posts with the right tone, structure, and hooks to drive engagement.",
  },
  {
    icon: Calendar,
    title: "Schedule Content",
    description:
      "Plan and organize your content calendar so you publish consistently and never miss the best posting windows.",
  },
];

export default function Home() {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    return () => {
      if (previousTheme) setTheme(previousTheme);
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">
              PostPilot
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/pricing"
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center sm:pt-32">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Send className="size-3.5 text-primary" />
              AI-Powered LinkedIn Content
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI-powered LinkedIn{" "}
              <span className="whitespace-nowrap text-primary">content partner</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              PostPilot helps you brainstorm, draft, and schedule high-performing
              LinkedIn posts. Spend less time writing and more time building your
              professional brand.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section — ambient backdrop matches the in-app shell:
            slate-200 base + four corner gradient blobs + dot-grid pattern.
            Section is `relative isolate overflow-hidden` so the blobs
            extending past corners get clipped at section bounds.

            The base background gradient fades from page bg-background at
            the top edge, into solid slate-200 across the middle, and back
            to bg-background at the bottom edge — so the section feels
            like an ambient swell rather than a hard color band. Border-t
            is dropped since the fade itself supplies the transition. */}
        <section
          className="relative isolate overflow-hidden py-20"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-background) 0%, #E2E8F0 18%, #E2E8F0 82%, var(--color-background) 100%)",
          }}
        >
          {/* Top-left grey blob — anchors the upper-left corner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 -top-40 -z-10 size-[63rem] rounded-full bg-gradient-to-bl from-slate-600/20 via-slate-500/12 to-transparent blur-3xl"
          />
          {/* Top-right brand-blue blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[42rem] rounded-full bg-gradient-to-br from-blue-400/35 via-sky-300/25 to-transparent blur-3xl"
          />
          {/* Mid-right sky blob — fills the right side as the page gets taller */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-48 top-1/2 -z-10 size-[38rem] -translate-y-1/4 rounded-full bg-gradient-to-l from-sky-400/28 via-cyan-300/18 to-transparent blur-3xl"
          />
          {/* Bottom-left indigo/purple blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-[42rem] rounded-full bg-gradient-to-tr from-indigo-500/30 via-purple-400/22 to-transparent blur-3xl"
          />
          {/* Bottom-center violet accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-[28rem] rounded-full bg-gradient-to-t from-violet-500/22 to-transparent blur-3xl"
          />
          {/* Full-bleed dot-grid pattern with vignette mask */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              color: "var(--color-muted-foreground, #94a3b8)",
              maskImage:
                "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
            }}
          />

          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Everything you need to grow on LinkedIn
              </h2>
              <p className="mt-3 text-muted-foreground">
                From first idea to published post, PostPilot streamlines your
                entire content workflow.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Product screenshots — see-it-in-action carousel.
            Section spans the full page width so the 3D peek layout has
            wing-space on either side of the centered frame for prev/next
            slide previews to extend into. No top border — the features
            section above fades to bg-background at its bottom edge, so
            the transition is already seamless. */}
        <section className="py-20">
          <div className="mx-auto mb-12 max-w-4xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              See PostPilot in action
            </h2>
            <p className="mt-3 text-balance text-muted-foreground">
              Replace blank-page anxiety with on-trend drafts, planned posts, and a clear view of what&apos;s actually working.
            </p>
          </div>
          <ScreenshotCarousel
            size="xl"
            intervalMs={8000}
            slides={[
              {
                src: "/images/carousel/launch-pad.png",
                alt: "PostPilot Launch Pad: daily focus screen with quick actions",
                title: "Launch Pad",
                caption: "Stop wondering where to start. See exactly what to work on next.",
              },
              {
                src: "/images/carousel/post-editor.png",
                alt: "PostPilot post editor with AI strategist sidebar",
                title: "Post Editor",
                caption: "Draft polished, on-trend posts with an AI strategist who knows your voice.",
              },
              {
                src: "/images/carousel/calendar.png",
                alt: "PostPilot content calendar: monthly view of scheduled posts",
                title: "Content Calendar",
                caption: "Stay organized and consistent. Never miss a posting window again.",
              },
              {
                src: "/images/carousel/analytics.png",
                alt: "PostPilot analytics dashboard: engagement, impressions, content pillars",
                title: "Analytics",
                caption: "Get a deep view into the hooks, topics, and formats that actually move your audience.",
              },
            ]}
          />
        </section>

        {/* AI Provider Logos */}
        <LogoMarquee />

        {/* Bottom CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ready to level up your LinkedIn presence?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Join professionals who use PostPilot to create engaging content
              that builds their network and opens new opportunities.
            </p>
            <div className="mt-8">
              <Link
                href="/pricing"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Choose your plan
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
