"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  Eye,
  Hash,
  List,
  Loader2,
  MessageCircle,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Pilcrow,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { createClient } from "@/lib/supabase/client";
import { LINKEDIN, POST_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Post, PostVersion, AIMessage, AIConversation, CreatorProfile } from "@/types";

// ─── Quick suggestion chips for the AI chat ───────────────────────────────────
const QUICK_SUGGESTIONS = [
  "Add a hook",
  "Make it shorter",
  "Make it personal",
  "Add a CTA",
  "Make it more engaging",
] as const;

// ─── Character counter color helper ───────────────────────────────────────────
function charCountColor(count: number): string {
  if (count > 2900) return "text-red-600";
  if (count >= 2500) return "text-yellow-600";
  return "text-green-600";
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function PostWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const supabase = createClient();

  // ── Post state ────────────────────────────────────────────────────────────
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [status, setStatus] = useState<Post["status"]>("draft");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // ── Version state ─────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<CreatorProfile | null>(null);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Hashtag state ─────────────────────────────────────────────────────────
  const [suggestingHashtags, setSuggestingHashtags] = useState(false);

  // ── Preview & schedule state ─────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // ── Textarea ref for auto-resize and formatting helpers ───────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch post, profile, versions, and conversation on mount ──────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .eq("user_id", user.id)
        .single();

      if (postError || !postData) {
        router.push("/posts");
        return;
      }

      const p = postData as Post;
      setPost(p);
      setTitle(p.title ?? "");
      setContent(p.content ?? "");
      setHashtags(p.hashtags ?? []);
      setStatus(p.status);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as CreatorProfile);
      }

      // Fetch versions
      const { data: versionsData } = await supabase
        .from("post_versions")
        .select("*")
        .eq("post_id", postId)
        .order("version_number", { ascending: false });

      if (versionsData) {
        setVersions(versionsData as PostVersion[]);
      }

      // Fetch existing conversation
      const { data: convData } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (convData) {
        const conv = convData as AIConversation;
        setConversationId(conv.id);
        setChatMessages(conv.messages ?? []);
      }

      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  // ── Scroll chat to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Debounced auto-save ───────────────────────────────────────────────────
  const autoSave = useCallback(
    async (newTitle: string, newContent: string, newHashtags: string[]) => {
      if (!post) return;

      setSaveStatus("saving");
      const { error } = await supabase
        .from("posts")
        .update({
          title: newTitle || null,
          content: newContent,
          hashtags: newHashtags,
          character_count: newContent.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (!error) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    },
    [post, supabase]
  );

  function scheduleAutoSave(
    newTitle: string,
    newContent: string,
    newHashtags: string[]
  ) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(newTitle, newContent, newHashtags);
    }, 2000);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleAutoSave(value, content, hashtags);
  }

  function handleContentChange(value: string) {
    if (value.length > LINKEDIN.MAX_POST_LENGTH) return;
    setContent(value);
    scheduleAutoSave(title, value, hashtags);
  }

  // ── Formatting helpers ────────────────────────────────────────────────────
  function insertAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      content.slice(0, start) + text + content.slice(end);

    if (newContent.length > LINKEDIN.MAX_POST_LENGTH) return;

    setContent(newContent);
    scheduleAutoSave(title, newContent, hashtags);

    // Restore cursor position after insert
    requestAnimationFrame(() => {
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
      textarea.focus();
    });
  }

  // ── Hashtag management ────────────────────────────────────────────────────
  function removeHashtag(tag: string) {
    const updated = hashtags.filter((h) => h !== tag);
    setHashtags(updated);
    scheduleAutoSave(title, content, updated);
  }

  async function suggestHashtags() {
    if (!content.trim()) return;
    setSuggestingHashtags(true);

    try {
      const response = await fetch("/api/ai/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, count: 5 }),
      });

      if (!response.ok) throw new Error("Failed to get hashtags");
      const data = await response.json();

      const suggested: string[] = Array.isArray(data.hashtags)
        ? data.hashtags
        : Array.isArray(data)
          ? data
          : [];

      // Merge without duplicates, respecting max
      const merged = [...new Set([...hashtags, ...suggested])].slice(
        0,
        LINKEDIN.MAX_HASHTAGS
      );
      setHashtags(merged);
      scheduleAutoSave(title, content, merged);
    } catch (err) {
      console.error("Hashtag suggestion error:", err);
    } finally {
      setSuggestingHashtags(false);
    }
  }

  // ── Status management ─────────────────────────────────────────────────────
  async function updateStatus(newStatus: Post["status"]) {
    if (!post) return;

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "posted") {
      updates.posted_at = new Date().toISOString();
    }

    // Clear scheduled_for when moving back to draft or review
    if (newStatus === "draft" || newStatus === "review") {
      updates.scheduled_for = null;
    }

    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", post.id);

    if (!error) {
      setStatus(newStatus);
    }
  }

  // ── Schedule post with date/time ────────────────────────────────────────
  async function schedulePost(date: Date) {
    if (!post) return;

    const { error } = await supabase
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_for: date.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (!error) {
      setStatus("scheduled");
    }
  }

  // ── Version management ────────────────────────────────────────────────────
  async function saveVersion() {
    if (!post) return;
    setSavingVersion(true);

    const nextNumber = versions.length > 0 ? versions[0].version_number + 1 : 1;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("post_versions")
      .insert({
        post_id: post.id,
        user_id: user.id,
        content,
        version_number: nextNumber,
        label: `Version ${nextNumber}`,
      })
      .select("*")
      .single();

    if (!error && data) {
      setVersions([data as PostVersion, ...versions]);
    }

    setSavingVersion(false);
  }

  function loadVersion(version: PostVersion) {
    setContent(version.content);
    scheduleAutoSave(title, version.content, hashtags);
  }

  // ── AI Chat ───────────────────────────────────────────────────────────────
  async function sendChatMessage(messageText: string) {
    if (!messageText.trim() || chatStreaming) return;

    const userMessage: AIMessage = {
      role: "user",
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatStreaming(true);

    // Create placeholder for AI response
    const aiMessage: AIMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setChatMessages([...updatedMessages, aiMessage]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          postContent: content,
          postTitle: title,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setChatMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulatedText,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      // Persist conversation
      const finalMessages = [
        ...updatedMessages,
        { role: "assistant" as const, content: accumulatedText, timestamp: new Date().toISOString() },
      ];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (conversationId) {
          await supabase
            .from("ai_conversations")
            .update({
              messages: finalMessages,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        } else {
          const { data: newConv } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: user.id,
              post_id: postId,
              context_type: "post",
              messages: finalMessages,
            })
            .select("id")
            .single();

          if (newConv) {
            setConversationId(newConv.id);
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setChatStreaming(false);
    }
  }

  function applyAIContent(messageContent: string) {
    setContent(messageContent);
    scheduleAutoSave(title, messageContent, hashtags);
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) return null;

  const statusConfig = POST_STATUSES[status];
  const charCount = content.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/posts")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Badge variant="secondary" className={cn("shrink-0", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="size-3" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* LinkedIn Preview Toggle */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" className="gap-1.5" />}
            >
              <Eye className="size-3.5" />
              Preview
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>LinkedIn Preview</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <LinkedInPreview
                  content={
                    content +
                    (hashtags.length > 0
                      ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ")
                      : "")
                  }
                  authorName={profile?.full_name ?? "Your Name"}
                  authorHeadline={profile?.headline ?? "Your headline"}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Chat panel toggle */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="lg:hidden"
          >
            {chatOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="hidden gap-1.5 lg:inline-flex"
          >
            {chatOpen ? (
              <PanelRightClose className="size-3.5" />
            ) : (
              <PanelRightOpen className="size-3.5" />
            )}
            {chatOpen ? "Hide AI" : "Show AI"}
          </Button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* ─── Left Panel: Editor ─────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col overflow-y-auto min-h-0",
            chatOpen ? "w-full lg:w-[60%]" : "w-full"
          )}
        >
          <div className="flex flex-1 flex-col space-y-4">
            {/* Post title */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title..."
              className="w-full border-none bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
            />

            <Separator />

            {/* Main content textarea */}
            <div className="flex-1 flex">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing your LinkedIn post..."
                className="min-h-[300px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Character counter */}
            <div className="flex items-center justify-between text-xs">
              <span className={cn("font-medium tabular-nums", charCountColor(charCount))}>
                {charCount} / {LINKEDIN.MAX_POST_LENGTH}
              </span>
              {charCount > 0 && (
                <span className="text-muted-foreground">
                  First {LINKEDIN.HOOK_VISIBLE_LENGTH} chars visible before &quot;see
                  more&quot;
                  {charCount > LINKEDIN.HOOK_VISIBLE_LENGTH && (
                    <span className="ml-1 text-yellow-600">
                      (hook ends at char {LINKEDIN.HOOK_VISIBLE_LENGTH})
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Hook line indicator bar */}
            {charCount > 0 && (
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/30 transition-all"
                  style={{
                    width: `${Math.min((charCount / LINKEDIN.MAX_POST_LENGTH) * 100, 100)}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-yellow-500"
                  style={{
                    left: `${(LINKEDIN.HOOK_VISIBLE_LENGTH / LINKEDIN.MAX_POST_LENGTH) * 100}%`,
                  }}
                />
              </div>
            )}

            {/* Formatting helpers */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => insertAtCursor("\n")}
              >
                <Pilcrow className="size-3" />
                Line break
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => insertAtCursor("\n\u2022 ")}
              >
                <List className="size-3" />
                Bullet point
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => insertAtCursor("\n\u2014 ")}
              >
                <Minus className="size-3" />
                Em dash
              </Button>
            </div>

            <Separator />

            {/* Hashtags section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Hash className="size-3.5" />
                  Hashtags
                  <span className="text-xs text-muted-foreground">
                    ({hashtags.length}/{LINKEDIN.MAX_HASHTAGS})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1"
                  onClick={suggestHashtags}
                  disabled={suggestingHashtags || !content.trim()}
                >
                  {suggestingHashtags ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  Suggest Hashtags
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    #{tag}
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
                {hashtags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No hashtags yet. Click &quot;Suggest Hashtags&quot; to generate some.
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Status bar + Version management */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                {/* Status actions based on current status */}
                {status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => updateStatus("review")}
                  >
                    <Eye className="size-3.5" />
                    Move to Review
                  </Button>
                )}
                {status === "review" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => updateStatus("draft")}
                    >
                      Back to Draft
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setScheduleDialogOpen(true)}
                    >
                      Schedule
                    </Button>
                  </>
                )}
                {status === "scheduled" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => updateStatus("review")}
                    >
                      Back to Review
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => updateStatus("posted")}
                    >
                      <Check className="size-3.5" />
                      Mark as Posted
                    </Button>
                  </>
                )}
                {status === "posted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => updateStatus("archived")}
                  >
                    Archive
                  </Button>
                )}
                {status === "archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => updateStatus("draft")}
                  >
                    Restore to Draft
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Save Version */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={saveVersion}
                  disabled={savingVersion || !content.trim()}
                >
                  {savingVersion ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Version
                </Button>

                {/* View Versions Dropdown */}
                {versions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="sm" className="gap-1.5" />
                      }
                    >
                      <ChevronDown className="size-3.5" />
                      Versions ({versions.length})
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Version History</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {versions.map((v) => (
                        <DropdownMenuItem
                          key={v.id}
                          onClick={() => loadVersion(v)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {v.label ?? `Version ${v.version_number}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Panel: AI Chat ───────────────────────────────────────── */}
        {chatOpen && (
          <div className="flex w-full flex-col overflow-hidden border-l pl-4 lg:w-[40%] min-h-0">
            {/* Chat header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI Assistant</p>
                  <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                    Discussing: {title || "Untitled Post"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setChatOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <Separator />

            {/* Chat messages area */}
            <ScrollArea className="flex-1 min-h-0 py-3">
              <div className="space-y-4 pr-2">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <MessageCircle className="size-5 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm font-medium">Start a conversation</p>
                    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                      Ask the AI to help refine your post, suggest hooks, or improve
                      your writing.
                    </p>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                        {chatStreaming &&
                          i === chatMessages.length - 1 &&
                          msg.role === "assistant" &&
                          msg.content === "" && (
                            <span className="inline-flex items-center gap-0.5">
                              <span className="size-1.5 animate-pulse rounded-full bg-current" />
                              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:0.15s]" />
                              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:0.3s]" />
                            </span>
                          )}
                      </div>

                      {/* "Apply to Editor" button for long AI responses */}
                      {msg.role === "assistant" &&
                        msg.content.length > 200 &&
                        !chatStreaming && (
                          <button
                            onClick={() => applyAIContent(msg.content)}
                            className="mt-2 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Sparkles className="size-3" />
                            Apply to Editor
                          </button>
                        )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-1.5 py-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendChatMessage(suggestion)}
                  disabled={chatStreaming}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Chat input */}
            <div className="flex items-end gap-2 pb-1">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage(chatInput);
                  }
                }}
                placeholder="Ask the AI anything..."
                rows={1}
                className="field-sizing-content min-h-[36px] max-h-[120px] flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                size="icon"
                onClick={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim() || chatStreaming}
              >
                {chatStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={schedulePost}
      />
    </div>
  );
}
