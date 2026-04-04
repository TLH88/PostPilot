"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Plus, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const supabase = createClient();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get workspace memberships
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

      setActiveId(getActiveWorkspaceId());
      setLoaded(true);
    }
    load();
  }, [supabase]);

  if (!loaded || workspaces.length === 0) return null;

  const activeWorkspace = workspaces.find((w) => w.id === activeId);
  const displayName = activeWorkspace?.name ?? "Personal";
  const isPersonal = !activeId;

  function handleSwitch(workspaceId: string | null) {
    setActiveWorkspaceId(workspaceId);
    setActiveId(workspaceId);
    // Reload to refresh all queries with new workspace context
    window.location.reload();
  }

  return (
    <div className="px-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between gap-2 text-xs h-8"
            />
          }
        >
          <span className="flex items-center gap-1.5 truncate">
            {isPersonal ? (
              <User className="size-3 shrink-0" />
            ) : (
              <Building2 className="size-3 shrink-0" />
            )}
            {displayName}
          </span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleSwitch(null)}
              className={cn(isPersonal && "bg-accent font-semibold")}
            >
              <User className="size-3.5 mr-2" />
              Personal
            </DropdownMenuItem>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className={cn(activeId === ws.id && "bg-accent font-semibold")}
              >
                <Building2 className="size-3.5 mr-2" />
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspace/setup")}>
              <Plus className="size-3.5 mr-2" />
              Create Workspace
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
