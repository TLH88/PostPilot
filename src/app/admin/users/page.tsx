"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Check, X, Sparkles, UserCog, ChevronDown, ChevronRight, FileText, Lightbulb, MessageCircle, Calendar, MoreVertical, Building2, UserPlus, UserMinus, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUBSCRIPTION_TIERS, TIER_BADGE_COLORS, type SubscriptionTier } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: SubscriptionTier;
  managed_ai_access: boolean;
  managed_ai_expires_at: string | null;
  onboarding_completed: boolean;
  ai_provider: string | null;
  hasPersonalKey: boolean;
  lastSignIn: string | null;
  createdAt: string;
  updated_at: string | null;
  workspaces: { id: string; name: string }[];
  stats: {
    totalPosts: number;
    postedPosts: number;
    draftPosts: number;
    totalIdeas: number;
    currentQuota: {
      posts: number;
      brainstorms: number;
      chatMessages: number;
      scheduled: number;
    } | null;
  };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function isOnline(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false;
  return Date.now() - new Date(lastSignIn).getTime() < 15 * 60 * 1000; // 15 min
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    setUsers(data.users);
    setAllWorkspaces(data.workspaces ?? []);
    setLoading(false);
  }

  async function updateUser(userId: string, updates: Record<string, unknown>) {
    setUpdating(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, updates }),
    });

    if (res.ok) {
      toast.success("User updated");
      // Optimistic update — patch local state instead of full reload
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, ...updates } : u
        )
      );
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update user");
    }
    setUpdating(null);
  }

  async function workspaceAction(action: "add_to_workspace" | "remove_from_workspace", userId: string, workspaceId: string) {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, workspaceId }),
    });

    if (res.ok) {
      toast.success(action === "add_to_workspace" ? "User added to workspace" : "User removed from workspace");
      // Optimistic update for workspace changes
      const wsName = allWorkspaces.find((w) => w.id === workspaceId)?.name ?? "";
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (action === "add_to_workspace") {
            return { ...u, workspaces: [...u.workspaces, { id: workspaceId, name: wsName }] };
          }
          return { ...u, workspaces: u.workspaces.filter((w) => w.id !== workspaceId) };
        })
      );
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  }

  async function impersonate(email: string) {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      const data = await res.json();
      window.open(data.callbackUrl, "_blank");
      toast.success(`Impersonating ${email} in new tab`);
    } else {
      toast.error("Failed to impersonate user");
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q)
    );
  });

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
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">{users.length} registered users</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* User table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">AI Access</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trial Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posts</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isExpired = user.managed_ai_expires_at && new Date(user.managed_ai_expires_at) < new Date();
                  return (
                    <React.Fragment key={user.id}>
                    <tr className="border-b last:border-0 hover:bg-hover-highlight cursor-pointer" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedUser === user.id ? <ChevronDown className="size-3 text-muted-foreground shrink-0" /> : <ChevronRight className="size-3 text-muted-foreground shrink-0" />}
                          <div>
                            <p className="font-medium">{user.full_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                        {user.workspaces.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.workspaces.map((ws) => (
                              <Badge key={ws.id} variant="outline" className="text-[10px]">{ws.name}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer",
                                  TIER_BADGE_COLORS[user.subscription_tier] ?? TIER_BADGE_COLORS.free
                                )}
                              />
                            }
                          >
                            {SUBSCRIPTION_TIERS[user.subscription_tier]?.label ?? "Free"}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Change Tier</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTier[]).map((tier) => (
                                <DropdownMenuItem
                                  key={tier}
                                  onClick={() => updateUser(user.id, { subscription_tier: tier })}
                                  className={cn(user.subscription_tier === tier && "bg-accent font-semibold")}
                                >
                                  {SUBSCRIPTION_TIERS[tier].label}
                                  {user.subscription_tier === tier && <Check className="size-3.5 ml-auto text-primary" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          // Determine AI access source
                          const hasTeamKey = user.workspaces.length > 0;
                          const hasManagedAccess = user.managed_ai_access && !isExpired;
                          let accessType: string;
                          let accessColor: string;
                          if (user.hasPersonalKey) {
                            accessType = "Personal Key";
                            accessColor = "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
                          } else if (hasTeamKey) {
                            accessType = "Team Key";
                            accessColor = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                          } else if (hasManagedAccess) {
                            accessType = "System Key";
                            accessColor = "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
                          } else {
                            accessType = "Not Active";
                            accessColor = "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
                          }
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer", accessColor)}
                                  />
                                }
                              >
                                {accessType}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-auto whitespace-nowrap">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>AI Access Type</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => updateUser(user.id, { managed_ai_access: true, managed_ai_expires_at: null })}>
                                    <Sparkles className="size-3.5 mr-2 text-purple-600" />
                                    System Key (Permanent)
                                    {accessType === "System Key" && <Check className="size-3 ml-auto text-primary" />}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateUser(user.id, {
                                    managed_ai_access: true,
                                    managed_ai_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                                  })}>
                                    <Sparkles className="size-3.5 mr-2 text-purple-400" />
                                    System Key (14-day Trial)
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem disabled>
                                    <Key className="size-3.5 mr-2 text-blue-600" />
                                    Personal Key
                                    {user.hasPersonalKey ? <Check className="size-3 ml-auto text-primary" /> : <span className="ml-auto text-[10px] text-muted-foreground">User managed</span>}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled>
                                    <Building2 className="size-3.5 mr-2 text-green-600" />
                                    Team Key
                                    {hasTeamKey ? <Check className="size-3 ml-auto text-primary" /> : <span className="ml-auto text-[10px] text-muted-foreground">Assign workspace</span>}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => updateUser(user.id, { managed_ai_access: false, managed_ai_expires_at: new Date().toISOString() })}>
                                    <X className="size-3.5 mr-2 text-red-600" />
                                    Deactivate System Access
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer",
                                  !user.managed_ai_expires_at
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : isExpired
                                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                )}
                              />
                            }
                          >
                            {!user.managed_ai_expires_at
                              ? "Permanent"
                              : isExpired
                                ? `Expired ${new Date(user.managed_ai_expires_at).toLocaleDateString()}`
                                : `Trial → ${new Date(user.managed_ai_expires_at).toLocaleDateString()}`}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-auto whitespace-nowrap">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>AI Access Duration</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: true,
                                managed_ai_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                              })}>
                                Set Trial: 7 days
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: true,
                                managed_ai_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                              })}>
                                Set Trial: 14 days
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: true,
                                managed_ai_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                              })}>
                                Set Trial: 30 days
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: true,
                                managed_ai_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                              })}>
                                Set Trial: 90 days
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: true,
                                managed_ai_expires_at: null,
                              })}>
                                <Sparkles className="size-3.5 mr-2 text-green-600" />
                                Grant Permanent Access
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateUser(user.id, {
                                managed_ai_access: false,
                                managed_ai_expires_at: new Date().toISOString(),
                              })}>
                                <X className="size-3.5 mr-2 text-red-600" />
                                Revoke Access
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "size-2 rounded-full",
                            isOnline(user.lastSignIn) ? "bg-green-500" : "bg-gray-300"
                          )} />
                          {user.onboarding_completed ? (
                            <Badge variant="secondary" className="text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Onboarding</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {timeAgo(user.lastSignIn)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {user.stats.totalPosts}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" />
                            }
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-auto whitespace-nowrap">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => impersonate(user.email)}>
                                <UserCog className="size-3.5 mr-2" />
                                Impersonate User
                              </DropdownMenuItem>
                              {allWorkspaces.length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Assign to Workspace</DropdownMenuLabel>
                                  {allWorkspaces
                                    .filter((ws) => !user.workspaces.some((uw) => uw.id === ws.id))
                                    .map((ws) => (
                                      <DropdownMenuItem
                                        key={ws.id}
                                        onClick={() => workspaceAction("add_to_workspace", user.id, ws.id)}
                                      >
                                        <UserPlus className="size-3.5 mr-2 text-green-600" />
                                        Add to {ws.name}
                                      </DropdownMenuItem>
                                    ))
                                  }
                                  {user.workspaces.length > 0 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Remove from Workspace</DropdownMenuLabel>
                                      {user.workspaces.map((ws) => (
                                        <DropdownMenuItem
                                          key={ws.id}
                                          onClick={() => workspaceAction("remove_from_workspace", user.id, ws.id)}
                                        >
                                          <UserMinus className="size-3.5 mr-2 text-red-600" />
                                          Remove from {ws.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedUser === user.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Activity */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Joined</span>
                                  <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Last Sign In</span>
                                  <span>{timeAgo(user.lastSignIn)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Last Updated</span>
                                  <span>{timeAgo(user.updated_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">AI Provider</span>
                                  <span>{user.ai_provider ?? "None"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Onboarded</span>
                                  <span>{user.onboarding_completed ? "Yes" : "No"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Content Stats */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <FileText className="size-3" /> Total Posts
                                  </span>
                                  <span className="font-medium">{user.stats.totalPosts}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground pl-4">Published</span>
                                  <span>{user.stats.postedPosts}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground pl-4">Drafts</span>
                                  <span>{user.stats.draftPosts}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Lightbulb className="size-3" /> Ideas
                                  </span>
                                  <span className="font-medium">{user.stats.totalIdeas}</span>
                                </div>
                              </div>
                            </div>

                            {/* Current Month Quota */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Month&apos;s Usage</p>
                              {user.stats.currentQuota ? (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <FileText className="size-3" /> Posts Created
                                    </span>
                                    <span>{user.stats.currentQuota.posts}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Lightbulb className="size-3" /> Brainstorms
                                    </span>
                                    <span>{user.stats.currentQuota.brainstorms}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <MessageCircle className="size-3" /> AI Messages
                                    </span>
                                    <span>{user.stats.currentQuota.chatMessages}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="size-3" /> Scheduled
                                    </span>
                                    <span>{user.stats.currentQuota.scheduled}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No usage this period</p>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
                              <div className="space-y-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-1.5 text-xs justify-start"
                                  onClick={() => impersonate(user.email)}
                                >
                                  <UserCog className="size-3" />
                                  Impersonate User
                                </Button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
