"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Send, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PostApproval } from "@/types";

interface ApprovalWithReviewer extends PostApproval {
  reviewer_name?: string;
}

interface ApprovalControlsProps {
  postId: string;
  workspaceId: string | null;
  currentUserId: string;
  postStatus: string;
  approvalStatus: string | null;
  approvalStage: string | null;
  onChange?: () => void;
}

export function ApprovalControls({
  postId,
  workspaceId,
  currentUserId,
  postStatus,
  approvalStatus,
  approvalStage,
  onChange,
}: ApprovalControlsProps) {
  const [approvals, setApprovals] = useState<ApprovalWithReviewer[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<"approve" | "request_changes" | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    // Check workspace config for approval requirements
    fetch(`/api/workspace/members?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        const me = (data.members ?? []).find((m: { user_id: string }) => m.user_id === currentUserId);
        setCanReview(me && ["owner", "admin", "editor"].includes(me.role));
      })
      .catch(() => {});

    // Load approval history
    fetch(`/api/posts/approval?postId=${postId}`)
      .then((r) => r.json())
      .then((data) => setApprovals(data.approvals ?? []))
      .catch(() => {});
  }, [postId, workspaceId, currentUserId]);

  async function submitForReview() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", postId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Submitted for review");
      onChange?.();
    } catch {
      toast.error("Failed to submit for review");
    } finally {
      setLoading(false);
    }
  }

  async function decide(decision: "approved" | "changes_requested") {
    setLoading(true);
    try {
      const res = await fetch("/api/posts/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide", postId, decision, feedback: feedback.trim() || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(decision === "approved" ? "Post approved" : "Changes requested");
      setShowFeedback(null);
      setFeedback("");
      onChange?.();
      // Reload history
      const r = await fetch(`/api/posts/approval?postId=${postId}`);
      if (r.ok) {
        const data = await r.json();
        setApprovals(data.approvals ?? []);
      }
    } catch {
      toast.error("Failed to record decision");
    } finally {
      setLoading(false);
    }
  }

  if (!workspaceId) return null;

  const isInReview = postStatus === "review" || approvalStatus === "pending";
  const isChangesRequested = approvalStatus === "changes_requested";
  const isApproved = approvalStatus === "approved";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Approval</h3>
        {isInReview && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
            In Review{approvalStage ? ` — ${approvalStage}` : ""}
          </span>
        )}
        {isApproved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="size-3" />
            Approved
          </span>
        )}
        {isChangesRequested && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-2 py-0.5 text-[10px] font-semibold">
            <AlertTriangle className="size-3" />
            Changes Requested
          </span>
        )}
      </div>

      {/* Actions */}
      {!isInReview && !isApproved && (postStatus === "draft" || postStatus === "past_due") && (
        <Button onClick={submitForReview} disabled={loading} size="sm" className="w-full gap-1.5">
          <Send className="size-3.5" />
          Submit for Review
        </Button>
      )}

      {isInReview && canReview && (
        <div className="space-y-2">
          {showFeedback === null ? (
            <div className="flex gap-2">
              <Button onClick={() => { setShowFeedback("approve"); }} size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="size-3.5" />
                Approve
              </Button>
              <Button onClick={() => setShowFeedback("request_changes")} size="sm" variant="outline" className="flex-1 gap-1.5">
                <XCircle className="size-3.5" />
                Request Changes
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={showFeedback === "approve" ? "Optional approval comment..." : "What changes are needed?"}
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowFeedback(null); setFeedback(""); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => decide(showFeedback === "approve" ? "approved" : "changes_requested")}
                  disabled={loading || (showFeedback === "request_changes" && !feedback.trim())}
                  className={cn(showFeedback === "approve" && "bg-green-600 hover:bg-green-700")}
                >
                  {showFeedback === "approve" ? "Confirm Approval" : "Request Changes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval history */}
      {approvals.length > 0 && (
        <div className="space-y-2 pt-3 border-t">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">History</p>
          {approvals.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <div className={cn(
                "flex size-5 items-center justify-center rounded-full shrink-0 mt-0.5",
                a.decision === "approved" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {a.decision === "approved" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p>
                  <span className="font-medium">{a.reviewer_name ?? "Reviewer"}</span>
                  <span className="text-muted-foreground"> {a.decision === "approved" ? "approved" : "requested changes"}</span>
                  {a.stage && <span className="text-muted-foreground"> at {a.stage}</span>}
                </p>
                {a.feedback && <p className="text-muted-foreground mt-0.5 italic">&quot;{a.feedback}&quot;</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
