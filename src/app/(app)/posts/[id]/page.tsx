"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  ClipboardCopy,
  FilePlus2,
  Zap,
  Eye,
  Hash,
  Lightbulb,
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
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { LinkedInShareDialog } from "@/components/linkedin-share-dialog";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { openLinkedInShare } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";
import { LINKEDIN, POST_STATUSES, AUTOSAVE_DEBOUNCE_MS, SAVE_STATUS_RESET_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { classifyPillar } from "@/lib/classify-pillar";
import { PROVIDER_DISPLAY_NAMES, type AIProvider } from "@/lib/ai/providers";
import { toast } from "sonner";
import { GenerateIdeasDialog } from "@/components/ideas/generate-ideas-dialog";
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
  const [pendingVersion, setPendingVersion] = useState<PostVersion | null>(null);
  const [showVersionConfirm, setShowVersionConfirm] = useState(false);
  const [activeVersion, setActiveVersion] = useState<PostVersion | null>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [convertedPostId, setConvertedPostId] = useState<string | null>(null);
  const [deletingVersion, setDeletingVersion] = useState(false);

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

  // ── LinkedIn publishing state ──────────────────────────────────────────
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Preview, schedule, share & delete state ─────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Content pillar state ──────────────────────────────────────────────────
  const [contentPillar, setContentPillar] = useState<string | null>(null);

  // ── Hook analysis state ──────────────────────────────────────────────────
  const [hookAnalysis, setHookAnalysis] = useState<{
    strength: "strong" | "moderate" | "weak";
    score: number;
    technique: string;
    feedback: string;
    suggestion?: string;
  } | null>(null);
  const [analyzingHook, setAnalyzingHook] = useState(false);

  // ── Brainstorm context menu state ────────────────────────────────────────
  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [brainstormTopic, setBrainstormTopic] = useState("");
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);

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
      setContentPillar(p.content_pillar ?? null);

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
        .maybeSingle();

      if (convData) {
        const conv = convData as AIConversation;
        setConversationId(conv.id);
        setChatMessages(conv.messages ?? []);
      }

      // Check LinkedIn connection status
      fetch("/api/linkedin/status")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.connected && !data.expired) {
            setLinkedinConnected(true);
          }
        })
        .catch(() => {});

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
        setTimeout(() => setSaveStatus("idle"), SAVE_STATUS_RESET_MS);

        // Auto-classify content pillar if not already set
        if (!contentPillar && newContent.length >= 100 && profile?.content_pillars?.length) {
          const suggested = classifyPillar(newTitle, newContent, profile.content_pillars);
          if (suggested) {
            updateContentPillar(suggested);
          }
        }
      } else {
        setSaveStatus("idle");
      }
    },
    [post, supabase, contentPillar, profile]
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
    }, AUTOSAVE_DEBOUNCE_MS);
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
    const selectedText = content.slice(start, end);
    const newContent =
      content.slice(0, start) + text + selectedText + content.slice(end);

    if (newContent.length > LINKEDIN.MAX_POST_LENGTH) return;

    setContent(newContent);
    scheduleAutoSave(title, newContent, hashtags);

    // Restore cursor position after insert — keep selected text highlighted
    requestAnimationFrame(() => {
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length + selectedText.length;
      textarea.focus();
    });
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);

    // Find the start of the current line
    const lastNewline = textBeforeCursor.lastIndexOf("\n");
    const currentLine = textBeforeCursor.slice(lastNewline + 1);

    // Check for bullet or em dash prefix
    const bulletMatch = currentLine.match(/^(\u2022 |\u2014 )/);
    if (!bulletMatch) return;

    const prefix = bulletMatch[1];
    const lineContent = currentLine.slice(prefix.length);

    e.preventDefault();

    if (lineContent.trim() === "") {
      // Empty formatted line — remove the prefix and exit format mode
      const lineStart = lastNewline + 1;
      const newContent =
        content.slice(0, lineStart) + content.slice(cursorPos);
      setContent(newContent);
      scheduleAutoSave(title, newContent, hashtags);
      requestAnimationFrame(() => {
        textarea.selectionStart = lineStart;
        textarea.selectionEnd = lineStart;
        textarea.focus();
      });
    } else {
      // Non-empty formatted line — auto-insert same prefix on new line
      const insertion = "\n" + prefix;
      const newContent =
        content.slice(0, cursorPos) + insertion + content.slice(cursorPos);
      if (newContent.length > LINKEDIN.MAX_POST_LENGTH) return;
      setContent(newContent);
      scheduleAutoSave(title, newContent, hashtags);
      requestAnimationFrame(() => {
        const newPos = cursorPos + insertion.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      });
    }
  }

  // ── Context menu for brainstorm ──────────────────────────────────────────
  function handleContextMenu(e: React.MouseEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selected = content.substring(textarea.selectionStart, textarea.selectionEnd);
    if (!selected.trim()) return; // Only show for text selection
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setBrainstormTopic(selected.trim());
  }

  // Close context menu on click away
  useEffect(() => {
    if (!contextMenuPos) return;
    function handleClick() {
      setContextMenuPos(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenuPos]);

  // ── Content pillar management ──────────────────────────────────────────
  async function updateContentPillar(pillar: string | null) {
    setContentPillar(pillar);
    if (!post) return;
    const { error } = await supabase
      .from("posts")
      .update({
        content_pillar: pillar,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    if (error) {
      toast.error("Failed to update content pillar");
    }
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

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || "Failed to suggest hashtags", {
          description: errData.action,
          duration: 8000,
        });
        return;
      }
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
      toast.error("Failed to suggest hashtags", {
        description: "Check your connection and try again.",
        duration: 8000,
      });
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

    // Auto-classify content pillar on status transitions if not set
    if (!contentPillar && content.length >= 100 && profile?.content_pillars?.length) {
      const suggested = classifyPillar(title, content, profile.content_pillars);
      if (suggested) {
        updates.content_pillar = suggested;
      }
    }

    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", post.id);

    if (!error) {
      setStatus(newStatus);
      if (updates.content_pillar) {
        setContentPillar(updates.content_pillar as string);
      }
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
      setShareDialogOpen(true);
    }
  }

  // ── Share on LinkedIn helper ──────────────────────────────────────────────
  async function analyzeHook() {
    if (!content.trim() || content.length < 20) {
      toast.info("Write at least a few sentences before analyzing the hook.");
      return;
    }
    setAnalyzingHook(true);
    setHookAnalysis(null);
    try {
      const res = await fetch("/api/ai/analyze-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Hook analysis failed", {
          description: data.action,
          duration: 8000,
        });
        setAnalyzingHook(false);
        return;
      }
      const data = await res.json();
      setHookAnalysis(data);
    } catch (error) {
      toast.error("Hook analysis failed", {
        description: "Check your connection and try again.",
        duration: 8000,
      });
    } finally {
      setAnalyzingHook(false);
    }
  }

  async function handleShareOnLinkedIn() {
    if (!post) return;

    // If LinkedIn API is connected, publish directly
    if (linkedinConnected) {
      setPublishing(true);
      try {
        const res = await fetch("/api/linkedin/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post.id }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.expired) {
            setLinkedinConnected(false);
          }
          toast.error(data.error || "Failed to publish to LinkedIn", {
            description: data.action,
            duration: 8000,
          });
          setPublishing(false);
          return;
        }

        setStatus("posted");
        setPost({ ...post, status: "posted", linkedin_post_url: data.linkedinPostUrl, linkedin_post_id: data.linkedinPostId });
        toast.success(
          <span>
            Posted to LinkedIn!{" "}
            <a href={data.linkedinPostUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              View post
            </a>
          </span>
        );
      } catch (error) {
        toast.error("Failed to publish to LinkedIn", {
          description: "Check your connection and try again.",
          duration: 8000,
        });
      } finally {
        setPublishing(false);
      }
      return;
    }

    // Fallback: open LinkedIn share redirect
    openLinkedInShare(content, hashtags);
  }

  async function copyPostToClipboard() {
    const hashtagText = hashtags.length > 0
      ? "\n\n" + hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
    const fullText = content + hashtagText;
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Post copied to clipboard — ready to paste into LinkedIn!");
    } catch {
      toast.error("Failed to copy. Try selecting the text manually.");
    }
  }

  // ── Delete post ─────────────────────────────────────────────────────────
  async function handleDeletePost() {
    if (!post) return;
    setDeleting(true);
    await supabase.from("posts").delete().eq("id", post.id);
    setDeleting(false);
    router.push("/posts");
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
        title,
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

  function requestLoadVersion(version: PostVersion) {
    // Check if current content matches the most recently saved version
    const latestVersion = versions[0];
    const hasUnsavedChanges =
      !latestVersion ||
      content !== latestVersion.content ||
      title !== (latestVersion.title ?? "");

    if (!hasUnsavedChanges) {
      // No changes since last save — switch directly
      applyVersion(version);
      return;
    }

    setPendingVersion(version);
    setShowVersionConfirm(true);
  }

  async function handleVersionConfirmSave() {
    await saveVersion();
    if (pendingVersion) {
      applyVersion(pendingVersion);
    }
    setShowVersionConfirm(false);
    setPendingVersion(null);
  }

  function handleVersionConfirmDiscard() {
    if (pendingVersion) {
      applyVersion(pendingVersion);
    }
    setShowVersionConfirm(false);
    setPendingVersion(null);
  }

  function applyVersion(version: PostVersion) {
    if (version.title !== undefined && version.title !== null) {
      setTitle(version.title);
    }
    setContent(version.content);
    setActiveVersion(version);
    scheduleAutoSave(version.title ?? title, version.content, hashtags);
  }

  async function createPostFromVersion(version?: PostVersion) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const postTitle = version ? version.title : title;
    const postContent = version ? version.content : content;

    if (!postContent.trim()) {
      toast.error("Cannot convert empty content to a post");
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        title: postTitle,
        content: postContent,
        status: "draft" as const,
        hashtags: [],
        character_count: postContent.length,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create post from version");
      return;
    }

    if (data) {
      toast.success("New post created from version");
      setConvertedPostId(data.id);
      // Only ask about deleting the version if one was active
      if (activeVersion) {
        setShowConvertConfirm(true);
      } else {
        router.push(`/posts/${data.id}`);
      }
    }
  }

  async function deleteVersionAndNavigate() {
    if (!activeVersion || !convertedPostId) return;
    setDeletingVersion(true);

    const { error } = await supabase
      .from("post_versions")
      .delete()
      .eq("id", activeVersion.id);

    setDeletingVersion(false);

    if (error) {
      toast.error("Failed to delete version");
    } else {
      toast.success("Version deleted");
    }

    setShowConvertConfirm(false);
    setActiveVersion(null);
    router.push(`/posts/${convertedPostId}`);
    setConvertedPostId(null);
  }

  function skipDeleteAndNavigate() {
    setShowConvertConfirm(false);
    setActiveVersion(null);
    if (convertedPostId) {
      router.push(`/posts/${convertedPostId}`);
      setConvertedPostId(null);
    }
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

      if (!response.ok) {
        let errMsg = "Something went wrong with the AI request.";
        let errAction = "Try again. If this keeps happening, check your API key in Settings.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
          if (errData.action) errAction = errData.action;
        } catch { /* ignore parse failure */ }
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `**${errMsg}**\n\n${errAction}`,
          };
          return updated;
        });
        setChatStreaming(false);
        return;
      }

      if (!response.body) {
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

          {/* Content pillar badge — editable only for posted posts */}
          {contentPillar && status !== "posted" && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Tag className="size-3" />
              {contentPillar}
            </Badge>
          )}
          {status === "posted" && (profile?.content_pillars?.length ?? 0) > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
                  />
                }
              >
                <Tag className="size-3" />
                {contentPillar ?? "Assign pillar"}
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto whitespace-nowrap">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Content Pillar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profile!.content_pillars.map((pillar) => (
                    <DropdownMenuItem
                      key={pillar}
                      onClick={() => updateContentPillar(pillar)}
                    >
                      {contentPillar === pillar && (
                        <Check className="size-3.5 mr-1.5" />
                      )}
                      {pillar}
                    </DropdownMenuItem>
                  ))}
                  {contentPillar && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateContentPillar(null)}>
                        <X className="size-3.5 mr-1.5" />
                        Remove pillar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
              {!content.trim() ? (
                <div className="flex min-h-[300px] w-full flex-1 flex-col items-center justify-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Start typing below or let AI draft something for you.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={chatStreaming}
                    onClick={() => {
                      if (!title.trim()) {
                        toast.info("Please enter a title for your post so the AI assistant can help you draft it.");
                        return;
                      }
                      if (!chatOpen) setChatOpen(true);
                      sendChatMessage(
                        `I am writing a LinkedIn post on the topic of ${title.trim()}. Write me a quick starter draft to get the ball rolling. Be sure to use my tone and voice. DO NOT ask any questions yet, focus on the start draft only`
                      );
                    }}
                  >
                    <Sparkles className="size-4" />
                    Start Initial Draft
                  </Button>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    onContextMenu={handleContextMenu}
                    placeholder="Start writing your LinkedIn post..."
                    className="min-h-[100px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  onContextMenu={handleContextMenu}
                  placeholder="Start writing your LinkedIn post..."
                  className="min-h-[300px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                />
              )}
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

            {/* Hook analysis card */}
            {hookAnalysis && (
              <div className={cn(
                "rounded-lg border p-3 text-sm",
                hookAnalysis.strength === "strong" && "border-green-200 bg-green-50",
                hookAnalysis.strength === "moderate" && "border-yellow-200 bg-yellow-50",
                hookAnalysis.strength === "weak" && "border-red-200 bg-red-50",
              )}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className={cn(
                      "size-3.5",
                      hookAnalysis.strength === "strong" && "text-green-600",
                      hookAnalysis.strength === "moderate" && "text-yellow-600",
                      hookAnalysis.strength === "weak" && "text-red-600",
                    )} />
                    <span className="font-medium capitalize">{hookAnalysis.strength} Hook</span>
                    <span className="text-xs text-muted-foreground">({hookAnalysis.score}/10)</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {hookAnalysis.technique}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{hookAnalysis.feedback}</p>
                {hookAnalysis.suggestion && (
                  <div className="mt-2 rounded border bg-background/80 p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Suggested improvement:</p>
                    <p className="text-xs italic">&ldquo;{hookAnalysis.suggestion}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {/* Formatting helpers */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={analyzeHook}
                disabled={analyzingHook || !content.trim() || content.length < 20}
              >
                {analyzingHook ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Zap className="size-3" />
                )}
                {analyzingHook ? "Analyzing..." : "Analyze Hook"}
              </Button>
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

              <div className="flex-1" />

              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={copyPostToClipboard}
                disabled={!content.trim()}
              >
                <ClipboardCopy className="size-3" />
                Copy Post
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
                    {tag.startsWith('#') ? tag : `#${tag}`}
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
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleShareOnLinkedIn}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
                      )}
                      {publishing ? "Publishing..." : linkedinConnected ? "Publish to LinkedIn" : "Post to LinkedIn"}
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
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleShareOnLinkedIn}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
                      )}
                      {publishing ? "Publishing..." : linkedinConnected ? "Publish to LinkedIn" : "Post to LinkedIn"}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => updateStatus("posted")}
                    >
                      <Check className="size-3.5" />
                      Mark as Posted to LinkedIn
                    </Button>
                  </>
                )}
                {status === "past_due" && (
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
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleShareOnLinkedIn}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
                      )}
                      {publishing ? "Publishing..." : linkedinConnected ? "Publish to LinkedIn" : "Post to LinkedIn"}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => updateStatus("posted")}
                    >
                      <Check className="size-3.5" />
                      Mark as Posted to LinkedIn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setScheduleDialogOpen(true)}
                    >
                      Reschedule
                    </Button>
                  </>
                )}
                {status === "posted" && (
                  <>
                    {post.linkedin_post_url && (
                      <a
                        href={post.linkedin_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium text-[#0A66C2] hover:bg-muted transition-colors"
                      >
                        <LinkedInIcon className="size-3.5" />
                        View on LinkedIn
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => updateStatus("archived")}
                    >
                      Archive
                    </Button>
                  </>
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

                {/* Archive (for non-archived/non-posted statuses) */}
                {!["archived", "posted"].includes(status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => updateStatus("archived")}
                  >
                    <Archive className="size-3.5" />
                    Archive
                  </Button>
                )}

                {/* Delete */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
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

                {/* Convert Version to Post */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => createPostFromVersion(activeVersion ?? undefined)}
                  disabled={!content.trim()}
                >
                  <FilePlus2 className="size-3.5" />
                  Convert to Post
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
                      {activeVersion
                        ? (activeVersion.label ?? `Version ${activeVersion.version_number}`)
                        : `Versions (${versions.length})`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Version History</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {versions.map((v) => (
                          <DropdownMenuItem
                            key={v.id}
                            onClick={() => requestLoadVersion(v)}
                            className={cn(
                              activeVersion?.id === v.id && "bg-accent font-semibold"
                            )}
                          >
                            <div className="flex w-full flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {v.label ?? `Version ${v.version_number}`}
                                </span>
                                {activeVersion?.id === v.id && (
                                  <Check className="size-3.5 text-primary" />
                                )}
                              </div>
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
                      </DropdownMenuGroup>
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
                  <p className="text-sm font-medium">
                    AI Assistant
                    {profile?.ai_provider && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({PROVIDER_DISPLAY_NAMES[profile.ai_provider as AIProvider]})
                      </span>
                    )}
                  </p>
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
                  className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-2.5 py-1 text-xs font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-600 disabled:opacity-50"
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

      {/* LinkedIn share dialog (shown after scheduling) */}
      <LinkedInShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        content={content}
        hashtags={hashtags}
      />

      {/* Delete confirmation dialog */}
      {/* ─── Version Switch Confirmation Dialog ──────────────────────────── */}
      <Dialog open={showVersionConfirm} onOpenChange={setShowVersionConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save them as a new
              version before switching?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleVersionConfirmDiscard}
            >
              Continue without saving
            </Button>
            <Button onClick={handleVersionConfirmSave} disabled={savingVersion}>
              {savingVersion ? "Saving..." : "Save version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently delete this post and all its versions.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Version to Post - Delete Confirmation Dialog */}
      <Dialog open={showConvertConfirm} onOpenChange={(open) => {
        if (!open) skipDeleteAndNavigate();
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete original version?</DialogTitle>
            <DialogDescription>
              Your new post has been created. Would you like to delete{" "}
              <span className="font-medium text-foreground">
                {activeVersion?.label ?? `Version ${activeVersion?.version_number}`}
              </span>{" "}
              from this post?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={skipDeleteAndNavigate}
            >
              No, keep it
            </Button>
            <Button
              variant="destructive"
              onClick={deleteVersionAndNavigate}
              disabled={deletingVersion}
            >
              {deletingVersion ? "Deleting..." : "Yes, delete version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context menu for brainstorm */}
      {contextMenuPos && (
        <div
          className="fixed z-50 rounded-lg border bg-popover p-1 shadow-lg"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            onClick={() => {
              autoSave(title, content, hashtags);
              setBrainstormOpen(true);
              setContextMenuPos(null);
            }}
          >
            <Lightbulb className="size-4" />
            Brainstorm as post topic
          </button>
        </div>
      )}

      {/* Brainstorm dialog triggered from context menu */}
      <GenerateIdeasDialog
        open={brainstormOpen}
        onOpenChange={setBrainstormOpen}
        initialTopic={brainstormTopic}
        contentPillars={profile?.content_pillars ?? []}
      />
    </div>
  );
}
