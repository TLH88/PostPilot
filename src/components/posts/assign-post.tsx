"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserX, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  role: string;
}

interface AssignPostProps {
  postId: string;
  workspaceId: string | null;
  assignedTo: string | null;
  currentUserId: string;
  onAssignmentChange?: (assigneeId: string | null) => void;
  variant?: "button" | "badge";
}

export function AssignPost({
  postId,
  workspaceId,
  assignedTo,
  currentUserId,
  onAssignmentChange,
  variant = "button",
}: AssignPostProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/members?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {});
  }, [workspaceId]);

  async function handleAssign(assigneeId: string | null) {
    if (assigneeId === assignedTo) return;
    setLoading(true);
    try {
      if (assigneeId === null) {
        const res = await fetch(`/api/posts/assign?postId=${postId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to unassign");
        toast.success("Post unassigned");
      } else {
        const res = await fetch("/api/posts/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, assigneeId }),
        });
        if (!res.ok) throw new Error("Failed to assign");
        const assignee = members.find((m) => m.user_id === assigneeId);
        toast.success(`Assigned to ${assignee?.full_name ?? "team member"}`);
      }
      onAssignmentChange?.(assigneeId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  }

  if (!workspaceId) return null; // only visible in workspace mode

  const assignee = assignedTo ? members.find((m) => m.user_id === assignedTo) : null;
  const initials = assignee?.full_name
    ? assignee.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === "badge" ? (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer transition-colors",
                assignee
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {initials ? (
                <>
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                    {initials}
                  </span>
                  <span>{assignee?.full_name?.split(" ")[0]}</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-3" />
                  <span>Assign</span>
                </>
              )}
            </button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" disabled={loading}>
              {assignee ? (
                <>
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                    {initials}
                  </span>
                  {assignee.full_name}
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  Assign
                </>
              )}
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleAssign(currentUserId)}>
            <UserPlus className="size-3.5 mr-2 text-primary" />
            Assign to me
            {assignedTo === currentUserId && <Check className="size-3 ml-auto text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {members.filter((m) => m.user_id !== currentUserId).map((m) => (
            <DropdownMenuItem key={m.user_id} onClick={() => handleAssign(m.user_id)}>
              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-bold mr-2">
                {m.full_name ? m.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
              </span>
              <span className="flex-1 truncate">{m.full_name ?? "Unknown"}</span>
              {assignedTo === m.user_id && <Check className="size-3 ml-2 text-primary" />}
            </DropdownMenuItem>
          ))}
          {assignedTo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAssign(null)} className="text-destructive focus:text-destructive">
                <UserX className="size-3.5 mr-2" />
                Unassign
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
