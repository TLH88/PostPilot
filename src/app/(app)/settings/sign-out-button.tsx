"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="gap-2"
    >
      {isSigningOut ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {isSigningOut ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
