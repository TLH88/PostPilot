"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DbAdmin {
  id: string;
  email: string;
  added_at: string;
  notes: string | null;
}

interface AdminsResponse {
  envAdmins: string[];
  dbAdmins: DbAdmin[];
}

export function AdminUsersCard() {
  const [data, setData] = useState<AdminsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) {
        toast.error("Failed to load admins");
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notes: newNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || `Add failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`${email} added as admin`);
      setAddOpen(false);
      setNewEmail("");
      setNewNotes("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(admin: DbAdmin) {
    if (!confirm(`Remove ${admin.email} from admins?`)) return;
    const res = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Remove failed");
      return;
    }
    toast.success(`${admin.email} removed`);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="size-4 text-red-500" />
          Admin Access
        </CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          Add admin
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Users with admin panel access. Admins set via the <code>ADMIN_EMAILS</code>{" "}
          env var act as a bootstrap and cannot be removed from this UI.
          Admins added below live in the database and can be edited at runtime.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Env-var bootstrap admins (locked) */}
            {data?.envAdmins && data.envAdmins.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Bootstrap (env var — locked)
                </p>
                <div className="space-y-1">
                  {data.envAdmins.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <Lock className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                      <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        ADMIN_EMAILS
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DB-managed admins */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Managed by you
              </p>
              {data?.dbAdmins.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  No admins added here yet. Click &quot;Add admin&quot; to invite one.
                </p>
              ) : (
                <ul className="space-y-1">
                  {data?.dbAdmins.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{a.email}</p>
                        {a.notes && (
                          <p className="text-[10px] text-muted-foreground">{a.notes}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Added {new Date(a.added_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(a)}
                        aria-label={`Remove ${a.email}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-4 text-red-500" />
              Add admin
            </DialogTitle>
            <DialogDescription>
              The user must already have a PostPilot account with this email.
              They&apos;ll have full admin access immediately after you add them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-admin-email" className="text-xs">Email</Label>
              <Input
                id="new-admin-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="someone@example.com"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-admin-notes" className="text-xs">
                Notes (optional)
              </Label>
              <Textarea
                id="new-admin-notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Why this person needs admin access, when to revoke, etc."
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="size-3.5 mr-1.5" />
                  Add admin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
