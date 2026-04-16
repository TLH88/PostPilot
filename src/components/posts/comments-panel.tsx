"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, CheckCircle2, Circle, Trash2, AtSign, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PostComment } from "@/types";

interface CommentWithAuthor extends PostComment {
  author_name?: string;
}

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
}

interface CommentsPanelProps {
  postId: string;
  workspaceId: string | null;
  currentUserId: string;
}

export function CommentsPanel({ postId, workspaceId, currentUserId }: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/members?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {});
  }, [workspaceId]);

  function extractMentions(content: string): string[] {
    const matches = content.match(/@\[([a-f0-9-]{36})\]/g) ?? [];
    return matches.map((m) => m.slice(2, -1));
  }

  function renderContent(content: string): React.ReactNode {
    // Replace @[uuid] with @Name
    return content.replace(/@\[([a-f0-9-]{36})\]/g, (_, uuid) => {
      const member = members.find((m) => m.user_id === uuid);
      return `@${member?.full_name ?? "Unknown"}`;
    });
  }

  async function handlePost(content: string, parentId: string | null = null) {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const mentions = extractMentions(content);
      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, parentId, mentions }),
      });
      if (!res.ok) throw new Error();
      await load();
      if (parentId) {
        setReplyingTo(null);
        setReplyContent("");
      } else {
        setNewComment("");
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolve(id: string, currentResolved: boolean) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: !currentResolved } : c)));
    try {
      await fetch("/api/posts/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: !currentResolved }),
      });
    } catch {
      toast.error("Failed to update comment");
      load();
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/posts/comments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  // Filter out resolved if showResolved is off
  const topLevelComments = comments
    .filter((c) => !c.parent_id)
    .filter((c) => showResolved || !c.resolved);

  const repliesByParent: Record<string, CommentWithAuthor[]> = {};
  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = [];
      repliesByParent[c.parent_id].push(c);
    }
  }

  const unresolvedCount = comments.filter((c) => !c.parent_id && !c.resolved).length;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Comments</h3>
          {unresolvedCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
              {unresolvedCount} open
            </span>
          )}
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      {/* New comment box */}
      <div className="p-4 border-b space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... Use @ to mention teammates."
          rows={2}
          className="text-sm resize-none"
        />
        {members.length > 0 && newComment.includes("@") && !newComment.match(/@\[[a-f0-9-]{36}\]$/) && (
          <div className="flex flex-wrap gap-1">
            {members
              .filter((m) => m.user_id !== currentUserId)
              .slice(0, 5)
              .map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => {
                    // Replace trailing @ with @[uuid]
                    const updated = newComment.replace(/@\s*$/, `@[${m.user_id}] `);
                    setNewComment(updated);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-hover-highlight"
                >
                  <AtSign className="size-2.5" />
                  {m.full_name}
                </button>
              ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => handlePost(newComment)}
            disabled={posting || !newComment.trim()}
          >
            {posting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {/* Comment list */}
      <div className="divide-y">
        {loading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">Loading...</div>
        ) : topLevelComments.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="size-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No comments yet. Start the discussion.</p>
          </div>
        ) : (
          topLevelComments.map((comment) => {
            const replies = repliesByParent[comment.id] ?? [];
            const initials = comment.author_name
              ? comment.author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              : "?";
            return (
              <div key={comment.id} className={cn("p-4 space-y-2", comment.resolved && "opacity-60")}>
                <div className="flex items-start gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{comment.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {comment.resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                          <CheckCircle2 className="size-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">{renderContent(comment.content)}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Reply className="size-3" />
                        Reply
                      </button>
                      <button
                        onClick={() => toggleResolve(comment.id, comment.resolved)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        {comment.resolved ? <Circle className="size-3" /> : <CheckCircle2 className="size-3" />}
                        {comment.resolved ? "Reopen" : "Resolve"}
                      </button>
                      {comment.user_id === currentUserId && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </button>
                      )}
                    </div>

                    {replyingTo === comment.id && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handlePost(replyContent, comment.id)} disabled={posting || !replyContent.trim()}>
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="mt-3 space-y-2 pl-3 border-l-2 border-border">
                        {replies.map((reply) => {
                          const rInitials = reply.author_name
                            ? reply.author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                            : "?";
                          return (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-[9px] font-bold shrink-0">
                                {rInitials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">{reply.author_name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">{renderContent(reply.content)}</p>
                                {reply.user_id === currentUserId && (
                                  <button
                                    onClick={() => deleteComment(reply.id)}
                                    className="text-[10px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1 mt-1"
                                  >
                                    <Trash2 className="size-2.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
