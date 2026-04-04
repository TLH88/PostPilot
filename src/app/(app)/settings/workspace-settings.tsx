"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type { Workspace } from "@/types";

export function WorkspaceSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const activeId = getActiveWorkspaceId();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      if (memberships?.length) {
        const ids = memberships.map((m) => m.workspace_id);
        const { data } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", ids)
          .order("name");
        setWorkspaces((data as Workspace[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Create and manage shared workspaces for your brand or team.
      </p>

      {workspaces.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No workspaces yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a workspace to start collaborating with your team.
          </p>
          <Button
            onClick={() => router.push("/workspace/setup")}
            className="mt-3 gap-1.5"
            size="sm"
          >
            <Plus className="size-3.5" />
            Create Workspace
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ws.name}</p>
                  {ws.brand_industry && (
                    <p className="text-xs text-muted-foreground">{ws.brand_industry}</p>
                  )}
                </div>
                {activeId === ws.id && (
                  <Badge variant="secondary" className="text-[10px]">Active</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/workspace/members")}
              >
                <Users className="size-3.5" />
                Members
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => router.push("/workspace/setup")}
            className="w-full gap-1.5"
            size="sm"
          >
            <Plus className="size-3.5" />
            Create Another Workspace
          </Button>
        </div>
      )}
    </div>
  );
}
