"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  Lightbulb,
  Loader2,
  Users,
  Target,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIER_BADGE_COLORS, SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface WorkspaceMember {
  user_id: string;
  role: string;
  joined_at: string | null;
  full_name: string | null;
  email: string | null;
  subscription_tier: string;
}

interface WorkspaceData {
  id: string;
  name: string;
  owner_id: string;
  brand_name: string | null;
  brand_industry: string | null;
  brand_uvp: string | null;
  brand_target_audience: string | null;
  brand_voice_guidelines: string | null;
  brand_content_pillars: string[];
  created_at: string;
  updated_at: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  members: WorkspaceMember[];
  postCount: number;
  ideaCount: number;
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { loadWorkspaces(); }, []);

  async function loadWorkspaces() {
    setLoading(true);
    const res = await fetch("/api/admin/workspaces");
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    setWorkspaces(data.workspaces);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Management</h1>
        <p className="text-muted-foreground">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Industry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Members</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posts</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ideas</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <React.Fragment key={ws.id}>
                    <tr
                      className="border-b last:border-0 hover:bg-hover-highlight cursor-pointer"
                      onClick={() => setExpandedWs(expandedWs === ws.id ? null : ws.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedWs === ws.id ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                          <Building2 className="size-4 text-primary" />
                          <span className="font-medium">{ws.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs">{ws.ownerName}</p>
                          <p className="text-[10px] text-muted-foreground">{ws.ownerEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {ws.brand_industry ? (
                          <Badge variant="outline" className="text-[10px]">{ws.brand_industry}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{ws.memberCount}</td>
                      <td className="px-4 py-3 tabular-nums">{ws.postCount}</td>
                      <td className="px-4 py-3 tabular-nums">{ws.ideaCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(ws.created_at).toLocaleDateString()}
                      </td>
                    </tr>

                    {/* Expanded details */}
                    {expandedWs === ws.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Brand Info */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Building2 className="size-3" /> Brand Details
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Brand Name</span>
                                  <span>{ws.brand_name ?? "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Industry</span>
                                  <span>{ws.brand_industry ?? "—"}</span>
                                </div>
                                {ws.brand_uvp && (
                                  <div>
                                    <span className="text-muted-foreground block">UVP</span>
                                    <p className="mt-0.5 text-[11px] leading-relaxed">{ws.brand_uvp}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Audience & Voice */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Target className="size-3" /> Audience & Voice
                              </p>
                              <div className="space-y-1 text-xs">
                                {ws.brand_target_audience && (
                                  <div>
                                    <span className="text-muted-foreground block">Target Audience</span>
                                    <p className="mt-0.5 text-[11px] leading-relaxed">{ws.brand_target_audience}</p>
                                  </div>
                                )}
                                {ws.brand_voice_guidelines && (
                                  <div>
                                    <span className="text-muted-foreground block">Voice Guidelines</span>
                                    <p className="mt-0.5 text-[11px] leading-relaxed line-clamp-3">{ws.brand_voice_guidelines}</p>
                                  </div>
                                )}
                                {ws.brand_content_pillars.length > 0 && (
                                  <div>
                                    <span className="text-muted-foreground block mb-1">Content Pillars</span>
                                    <div className="flex flex-wrap gap-1">
                                      {ws.brand_content_pillars.map((p) => (
                                        <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Usage Stats */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="size-3" /> Usage
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <FileText className="size-3" /> Posts
                                  </span>
                                  <span className="font-medium">{ws.postCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Lightbulb className="size-3" /> Ideas
                                  </span>
                                  <span className="font-medium">{ws.ideaCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="size-3" /> Members
                                  </span>
                                  <span className="font-medium">{ws.memberCount}</span>
                                </div>
                              </div>
                            </div>

                            {/* Members List */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Users className="size-3" /> Team Members
                              </p>
                              <div className="space-y-1.5">
                                {ws.members.map((m) => (
                                  <div key={m.user_id} className="flex items-center justify-between text-xs rounded-md border px-2 py-1.5">
                                    <div>
                                      <span className="font-medium">{m.full_name ?? "Unknown"}</span>
                                      {m.email && <span className="text-muted-foreground ml-1.5 text-[10px]">{m.email}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[9px]",
                                          m.role === "owner" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                        )}
                                      >
                                        {m.role === "owner" && <Crown className="size-2 mr-0.5" />}
                                        {m.role}
                                      </Badge>
                                      <span className={cn(
                                        "rounded-full px-1.5 py-0 text-[9px] font-medium",
                                        TIER_BADGE_COLORS[m.subscription_tier as SubscriptionTier] ?? TIER_BADGE_COLORS.free
                                      )}>
                                        {SUBSCRIPTION_TIERS[m.subscription_tier as SubscriptionTier]?.label ?? "Free"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {workspaces.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No workspaces created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
