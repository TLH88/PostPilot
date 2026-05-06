import Link from "next/link";
import { Send } from "lucide-react";

/**
 * Shared footer for public marketing pages (/, /pricing, etc.).
 * Single source of truth — edit this one file to update the footer
 * everywhere it's mounted.
 *
 * Layout: 12-col grid with brand block + Product / Legal / Contact
 * link columns, then a bottom row with copyright + LLC attribution.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand block — wider column. Tagline restates UVP one more
              time so the page closes on the value prop. */}
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2">
              <Send className="size-5 text-primary" />
              <span className="text-lg font-semibold tracking-tight">
                PostPilot
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The AI-powered LinkedIn content partner. Turn scattered
              ideas into a consistent, on-trend posting practice — and
              see what&apos;s actually working.
            </p>
          </div>

          {/* Product links */}
          <div className="lg:col-span-2 lg:col-start-7">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Product
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Legal
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact — mailto for now. Swap in a /contact page if/when
              one exists. */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Contact
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="mailto:support@mypostpilot.app"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  support@mypostpilot.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row — copyright + LLC ownership */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Foundry 88 Labs LLC. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            PostPilot is a product of{" "}
            <span className="font-medium text-foreground/80">
              Foundry 88 Labs LLC
            </span>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
