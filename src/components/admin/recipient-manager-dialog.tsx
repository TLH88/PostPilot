"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { EmailRecipient } from "@/components/admin/email-user-dialog";

export interface RecipientManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current set of recipients staged for the email. */
  recipients: EmailRecipient[];
  /** Full universe of admin-visible users to add from. */
  allUsers: EmailRecipient[];
  /** Called when admin clicks Apply with the edited list. */
  onApply: (next: EmailRecipient[]) => void;
}

/**
 * Add / remove individual recipients before sending. The dialog keeps a
 * local working copy so closing without Apply discards changes. Search
 * filters the not-yet-added users; already-added users show as removable
 * chips above the search results.
 */
export function RecipientManagerDialog({
  open,
  onOpenChange,
  recipients,
  allUsers,
  onApply,
}: RecipientManagerDialogProps) {
  const [working, setWorking] = useState<EmailRecipient[]>(recipients);
  const [query, setQuery] = useState("");

  // Reset working copy when dialog opens to the latest recipients prop
  // (use a key-style effect to avoid lifecycle complexity)
  if (open && working !== recipients && working.length === 0 && recipients.length > 0) {
    setWorking(recipients);
  }

  const workingIds = useMemo(() => new Set(working.map((r) => r.id)), [working]);

  const searchableNotAdded = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allUsers
      .filter((u) => !workingIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 50); // cap so a 1000-user list doesn't render forever
  }, [allUsers, workingIds, query]);

  function addUser(u: EmailRecipient) {
    setWorking((prev) => [...prev, u]);
  }
  function removeUser(id: string) {
    setWorking((prev) => prev.filter((r) => r.id !== id));
  }

  function handleApply() {
    onApply(working);
    onOpenChange(false);
  }

  function handleCancel() {
    setWorking(recipients); // discard
    setQuery("");
    onOpenChange(false);
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setWorking(recipients);
      setQuery("");
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit recipients</DialogTitle>
          <DialogDescription>
            {working.length} {working.length === 1 ? "recipient" : "recipients"} staged.
            Add or remove users before sending — no email leaves the system yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Currently-staged recipients */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Staged ({working.length})
            </p>
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2">
              {working.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-1">
                  No recipients. Add users below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {working.map((r) => (
                    <Badge
                      key={r.id}
                      variant="secondary"
                      className="gap-1 pr-1 max-w-full"
                    >
                      <span className="truncate text-[11px]">
                        {r.full_name ?? r.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeUser(r.id)}
                        aria-label={`Remove ${r.full_name ?? r.email}`}
                        className="ml-0.5 rounded hover:bg-destructive/20 hover:text-destructive p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search to add */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Add user
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {searchableNotAdded.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-3 py-3">
                  {query.trim()
                    ? "No matching users not already staged"
                    : "All users are already staged"}
                </p>
              ) : (
                <ul className="divide-y">
                  {searchableNotAdded.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{u.full_name ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addUser(u)}
                        className="gap-1 h-7 text-[11px]"
                      >
                        <Plus className="size-3" />
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {searchableNotAdded.length === 50 && (
                <p className="text-[10px] text-muted-foreground italic px-3 py-2 border-t">
                  Showing first 50 — refine your search to see more.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={working.length === 0}>
            Apply ({working.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
