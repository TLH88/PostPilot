"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Crown,
  Loader2,
  Trash2,
  ShieldCheck,
  Pencil,
  User,
  Eye,
  Info,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Workspace } from "@/types";

type Role = "owner" | "admin" | "editor" | "member" | "viewer";

interface MemberRow {
  id: string;
  user_id: string;
  role: Role;
  joined_at: string | null;
  invited_at: string | null;
  full_name?: string | null;
}

// Roles that can review/approve posts
const REVIEWER_ROLES: Role[] = ["owner", "admin", "editor"];

const ROLE_CONFIG: Record<Role, { label: string; description: string; icon: typeof Crown; color: string; canReview: boolean }> = {
  owner: {
    label: "Owner",
    description: "Full workspace control. Can manage members, settings, and approve posts.",
    icon: Crown,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    canReview: true,
  },
  admin: {
    label: "Admin",
    description: "Manage members and settings. Can approve posts.",
    icon: ShieldCheck,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    canReview: true,
  },
  editor: {
    label: "Editor",
    description: "Create and edit content. Can approve posts submitted by others.",
    icon: Pencil,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    canReview: true,
  },
  member: {
    label: "Member",
    description: "Create and edit their own content. Cannot approve posts.",
    icon: User,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    canReview: false,
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to workspace content. Cannot create or approve.",
    icon: Eye,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    canReview: false,
  },
};

export default function WorkspaceMembersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const workspaceId = getActiveWorkspaceId();

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id);

    // Fetch workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (!ws) {
      toast.error("Workspace not found");
      router.push("/dashboard");
      return;
    }

    setWorkspace(ws as Workspace);

    // Fetch members and resolve profile names
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("id, user_id, role, joined_at, invited_at")
      .eq("workspace_id", workspaceId);

    if (memberData) {
      const userIds = memberData.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("creator_profiles")
        .select("user_id, full_name")
        .in("user_id", userIds.length > 0 ? userIds : [""]);

      const nameMap: Record<string, string | null> = {};
      for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name;

      const enriched: MemberRow[] = memberData.map((m) => ({
        ...m,
        role: m.role as Role,
        full_name: nameMap[m.user_id] ?? null,
      }));
      setMembers(enriched);

      const me = enriched.find((m) => m.user_id === user.id);
      setCurrentUserRole(me?.role ?? null);
    }

    setLoading(false);
  }, [supabase, router, workspaceId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function changeRole(memberId: string, userId: string, newRole: Role) {
    if (!workspaceId) return;
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change role");
      }
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      loadData();
    }
  }

  const canManageRoles = currentUserRole === "owner" || currentUserRole === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="size-5" />
          Workspace Members
        </h1>
        <p className="text-muted-foreground">
          Manage team members for <strong>{workspace?.name}</strong>.
        </p>
      </div>

      {/* Role explanation panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Info className="size-4 text-primary" />
            Roles & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            return (
              <div key={role} className="flex items-start gap-3 text-xs">
                <Badge variant="secondary" className={cn("gap-1 shrink-0 mt-0.5", config.color)}>
                  <Icon className="size-2.5" />
                  {config.label}
                </Badge>
                <p className="text-muted-foreground flex-1">{config.description}</p>
                {config.canReview && (
                  <Badge variant="outline" className="shrink-0 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                    Can review
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {members.length} Member{members.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const initials = (member.full_name ?? "U")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const roleConfig = ROLE_CONFIG[member.role];
            const RoleIcon = roleConfig.icon;
            const isMe = member.user_id === currentUserId;
            const isOwner = member.role === "owner";
            const canChangeThisRole = canManageRoles && !isOwner && !isMe;

            return (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.full_name ?? "Unknown User"}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {member.joined_at
                        ? `Joined ${new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : "Invited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Role badge / dropdown */}
                  {canChangeThisRole ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity",
                              roleConfig.color
                            )}
                          />
                        }
                      >
                        <RoleIcon className="size-2.5" />
                        {roleConfig.label}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {(["admin", "editor", "member", "viewer"] as Role[]).map((role) => {
                            const rc = ROLE_CONFIG[role];
                            const RoleIconInner = rc.icon;
                            return (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => changeRole(member.id, member.user_id, role)}
                                disabled={updatingMemberId === member.id}
                                className="flex-col items-start gap-0.5"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <RoleIconInner className="size-3.5" />
                                  <span className="font-medium">{rc.label}</span>
                                  {member.role === role && <Check className="size-3 ml-auto text-primary" />}
                                  {rc.canReview && (
                                    <Badge variant="outline" className="text-[9px] ml-auto bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                      Reviewer
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground pl-5">{rc.description}</p>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="secondary" className={cn("gap-1", roleConfig.color)}>
                      <RoleIcon className="size-2.5" />
                      {roleConfig.label}
                    </Badge>
                  )}

                  {canManageRoles && !isOwner && !isMe && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMember(member.id)}
                      disabled={updatingMemberId === member.id}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info note */}
      <p className="text-xs text-muted-foreground text-center">
        Email-based invitations are coming soon. Owners and admins can change roles above.
      </p>
    </div>
  );
}
