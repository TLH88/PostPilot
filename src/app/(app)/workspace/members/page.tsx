"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Crown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { toast } from "sonner";
import type { Workspace } from "@/types";

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  invited_at: string | null;
  // Joined from creator_profiles
  full_name?: string | null;
}

export default function WorkspaceMembersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const workspaceId = getActiveWorkspaceId();

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

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
    setIsOwner(ws.owner_id === user.id);

    // Fetch members
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("id, user_id, role, joined_at, invited_at")
      .eq("workspace_id", workspaceId);

    if (memberData) {
      // Fetch names for each member
      const enriched: MemberRow[] = [];
      for (const m of memberData) {
        const { data: profile } = await supabase
          .from("creator_profiles")
          .select("full_name")
          .eq("user_id", m.user_id)
          .single();
        enriched.push({
          ...m,
          full_name: profile?.full_name ?? null,
        });
      }
      setMembers(enriched);
    }

    setLoading(false);
  }, [supabase, router, workspaceId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function removeMember(memberId: string) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="size-5" />
          Workspace Members
        </h1>
        <p className="text-muted-foreground">
          Manage team members for <strong>{workspace?.name}</strong>. Members can view and create
          content within the workspace.
        </p>
      </div>

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

            return (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.full_name ?? "Unknown User"}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${member.role === "owner" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : ""}`}
                      >
                        {member.role === "owner" && <Crown className="size-2.5 mr-0.5" />}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                      {member.joined_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeMember(member.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info note */}
      <p className="text-xs text-muted-foreground text-center">
        Email-based invitations are coming soon. For now, team members can be added directly through the workspace settings.
      </p>
    </div>
  );
}
