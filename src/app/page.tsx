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
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Send className="size-3.5 text-primary" />
              AI-Powered LinkedIn Content
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI-powered LinkedIn{" "}
              <span className="text-primary">content partner</span>
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

        {/* Features Section */}
        <section className="border-t bg-muted/30 py-20">
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
