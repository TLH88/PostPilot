"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkspaceDeleteTarget {
  id: string;
  name: string;
  memberCount: number;
}

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface WorkspaceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Workspace staged for deletion. */
  workspace: WorkspaceDeleteTarget | null;
  /** Other workspaces the admin can reassign members to. Excludes the source. */
  reassignOptions: WorkspaceOption[];
  onDeleted: () => void;
}

/**
 * Confirms workspace deletion. If the workspace has no members, just a
 * confirm step. With members, the admin picks: cascade (members lose
 * membership, content de-associated) or reassign (members + content move
 * to another workspace), or cancel.
 */
export function WorkspaceDeleteDialog({
  open,
  onOpenChange,
  workspace,
  reassignOptions,
  onDeleted,
}: WorkspaceDeleteDialogProps) {
  const [action, setAction] = useState<"cascade" | "reassign" | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Auto-pick cascade if workspace has no members (single confirmation step).
    setAction(workspace && workspace.memberCount === 0 ? "cascade" : null);
    setTargetWorkspaceId(null);
  }, [open, workspace]);

  if (!workspace) return null;

  const hasMembers = workspace.memberCount > 0;
  const targetWorkspace = reassignOptions.find((w) => w.id === targetWorkspaceId);

  async function handleDelete() {
    if (!workspace) return;
    if (action === "reassign" && !targetWorkspaceId) {
      toast.error("Pick a workspace to reassign members to");
      return;
    }
    if (!action) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "cascade"
            ? { action: "cascade" }
            : { action: "reassign", targetWorkspaceId },
        ),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Delete failed (HTTP ${res.status})`);
        return;
      }

      toast.success(`Workspace "${workspace.name}" deleted`, {
        description:
          action === "reassign" && targetWorkspace
            ? `Members + content moved to "${targetWorkspace.name}"`
            : "Members removed; content de-associated",
      });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" />
            Delete workspace
          </DialogTitle>
          <DialogDescription>
            <span className="block">
              You are about to delete{" "}
              <span className="font-medium text-foreground">{workspace.name}</span>.
              This cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>

        {hasMembers ? (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                This workspace has{" "}
                <span className="font-semibold">{workspace.memberCount}</span>{" "}
                {workspace.memberCount === 1 ? "member" : "members"} assigned.
                Choose what happens to them before deleting.
              </span>
            </div>

            <div className="space-y-2">
              {/* Reassign option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAction("reassign")}
                className={`w-full rounded-md border px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  action === "reassign"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <ArrowRight className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Reassign to another workspace</p>
                    <p className="text-xs text-muted-foreground">
                      Members + all posts, ideas, content library, and templates move to the
                      target workspace.
                    </p>
                    {action === "reassign" && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="outline" size="sm" className="w-full justify-between" />
                            }
                          >
                            <span>
                              {targetWorkspace
                                ? `→ ${targetWorkspace.name}`
                                : "Pick target workspace…"}
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-72">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Move to workspace</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {reassignOptions.length === 0 ? (
                                <DropdownMenuItem disabled>
                                  No other workspaces available
                                </DropdownMenuItem>
                              ) : (
                                reassignOptions.map((w) => (
                                  <DropdownMenuItem
                                    key={w.id}
                                    onClick={() => setTargetWorkspaceId(w.id)}
                                    className={w.id === targetWorkspaceId ? "bg-accent font-semibold" : ""}
                                  >
                                    {w.name}
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cascade option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAction("cascade")}
                className={`w-full rounded-md border px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  action === "cascade"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <UserMinus className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Remove all assigned users</p>
                    <p className="text-xs text-muted-foreground">
                      Users lose membership (no workspace assigned). Their posts, ideas, etc.
                      stay but are de-associated from any workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No members assigned. Workspace will be permanently removed.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting || !action || (action === "reassign" && !targetWorkspaceId)}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-3.5 mr-1.5" />
                {action === "reassign" ? "Reassign and delete" : "Delete workspace"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
