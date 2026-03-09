"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ChangeEmailProps {
  currentEmail: string;
}

export function ChangeEmail({ currentEmail }: ChangeEmailProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!newEmail || newEmail === currentEmail) {
      toast.error("Please enter a different email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast.success(
        "A confirmation link has been sent to your new email address."
      );
      setNewEmail("");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update email.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleChangeEmail} className="space-y-4">
      <div className="space-y-2">
        <Label>Current Email</Label>
        <p className="text-sm text-muted-foreground">{currentEmail}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newEmail">New Email Address</Label>
        <Input
          id="newEmail"
          type="email"
          placeholder="Enter new email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading || !newEmail}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mail className="size-4" />
        )}
        {loading ? "Updating..." : "Update Email"}
      </Button>
    </form>
  );
}
