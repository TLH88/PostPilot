"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield, Terminal } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/linkedin";

// Compile-time dev flag. In production builds `process.env.NODE_ENV` is "production"
// and this branch is tree-shaken out by Next.js, so the Dev Login button and its
// fetch call never appear in the prod bundle.
const IS_DEV = process.env.NODE_ENV === "development";
const DEV_LOGIN_SECRET = process.env.NEXT_PUBLIC_LOCAL_DEV_LOGIN_SECRET;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);

  // Show the dev button only in dev mode AND on a loopback host, both checked
  // at runtime so a leaked prod build can never render it.
  useEffect(() => {
    if (!IS_DEV) return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      setShowDevLogin(true);
    }
  }, []);

  async function handleLinkedInLogin() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: { redirectTo: `${window.location.origin}/callback` },
      });
    } catch {
      toast.error("Failed to connect to LinkedIn. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleDevLogin() {
    if (!DEV_LOGIN_SECRET) {
      toast.error("NEXT_PUBLIC_LOCAL_DEV_LOGIN_SECRET not set in .env.local");
      return;
    }
    setDevLoading(true);
    try {
      // Server-rendered redirect from the route handler will follow automatically.
      const res = await fetch("/api/dev/local-login", {
        method: "GET",
        headers: { "x-local-dev-secret": DEV_LOGIN_SECRET },
        redirect: "follow",
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      // Non-redirect means an error — surface the body.
      const body = await res.text();
      toast.error(`Dev login failed (${res.status}): ${body.slice(0, 200)}`);
    } catch (e) {
      toast.error(`Dev login error: ${(e as Error).message}`);
    } finally {
      setDevLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in with your LinkedIn account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          size="lg"
          className="w-full gap-2 bg-[#0A66C2] text-white hover:bg-[#004182]"
          onClick={handleLinkedInLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LinkedInIcon className="size-4" />
          )}
          {isLoading ? "Connecting..." : "Sign in with LinkedIn"}
        </Button>

        <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2.5">
          <Shield className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            We only request basic profile info. Your LinkedIn password is never shared with PostPilot.
          </p>
        </div>

        {showDevLogin && (
          <div className="mt-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
              <Terminal className="size-3.5" />
              Local dev only — never reachable in production
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleDevLogin}
              disabled={devLoading}
            >
              {devLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Terminal className="mr-2 size-4" />
              )}
              {devLoading ? "Signing in…" : "Dev Login"}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
