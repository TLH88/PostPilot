"use client";

/**
 * BP-130: Admin view of the tier waitlist (Team + Enterprise warm leads).
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WaitlistEntry {
  id: string;
  email: string;
  tier: "team" | "enterprise";
  message: string | null;
  ip_address: string | null;
  created_at: string;
  contacted_at: string | null;
  notes: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/waitlist");
    if (!res.ok) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }

  async function markContacted(entry: WaitlistEntry) {
    setUpdatingId(entry.id);
    const res = await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entry.id,
        contacted_at: entry.contacted_at ? null : new Date().toISOString(),
      }),
    });
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, contacted_at: e.contacted_at ? null : new Date().toISOString() }
            : e
        )
      );
    } else {
      toast.error("Failed to update");
    }
    setUpdatingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const teamCount = entries.filter((e) => e.tier === "team").length;
  const enterpriseCount = entries.filter((e) => e.tier === "enterprise").length;
  const uncontacted = entries.filter((e) => !e.contacted_at).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tier Waitlist</h1>
        <p className="text-muted-foreground">
          {entries.length} total · {teamCount} Team · {enterpriseCount} Enterprise · {uncontacted} not yet contacted
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Message</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contacted</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No waitlist entries yet.
                    </td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-hover-highlight">
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${e.email}`}
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {e.email}
                        <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {e.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-md text-xs text-muted-foreground">
                      {e.message || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(e.created_at)}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.contacted_at ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check className="size-3" />
                          {formatDate(e.contacted_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="xs"
                        variant={e.contacted_at ? "outline" : "default"}
                        onClick={() => markContacted(e)}
                        disabled={updatingId === e.id}
                      >
                        {updatingId === e.id && <Loader2 className="size-3 animate-spin" />}
                        {e.contacted_at ? "Mark not contacted" : "Mark contacted"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
