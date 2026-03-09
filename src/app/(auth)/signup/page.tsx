"use client";

import { useState } from "react";
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
import { Loader2, Shield } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/linkedin";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLinkedInSignup() {
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

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Connect your LinkedIn account to get started with PostPilot
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          size="lg"
          className="w-full gap-2 bg-[#0A66C2] text-white hover:bg-[#004182]"
          onClick={handleLinkedInSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LinkedInIcon className="size-4" />
          )}
          {isLoading ? "Connecting..." : "Continue with LinkedIn"}
        </Button>

        <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2.5">
          <Shield className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            We only request basic profile info. Your LinkedIn password is never shared with PostPilot.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
