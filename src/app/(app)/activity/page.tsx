"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ActivityFeed } from "@/components/activity/activity-feed";
import type { Workspace } from "@/types";

export default function ActivityPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(*)")
        .eq("user_id", user.id)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.workspaces) {
            setWorkspace((data.workspaces as unknown) as Workspace);
          }
          setLoading(false);
        });
    });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {workspace
            ? `Recent activity across the ${workspace.name} workspace.`
            : "Your recent activity across all posts."}
        </p>
      </div>

      <ActivityFeed
        workspaceId={workspace?.id ?? null}
        limit={100}
        title=""
      />
    </div>
  );
}
