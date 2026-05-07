"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  FilePlus2,
  Zap,
  Eye,
  Hash,
  ImagePlus,
  Lightbulb,
  Loader2,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  CalendarClock,
  CircleDot,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { maybeHandleQuotaExceeded } from "@/lib/errors/handle-quota-exceeded";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { LinkedInShareDialog } from "@/components/linkedin-share-dialog";
import { MarkPostedDialog } from "@/components/posts/mark-posted-dialog";
import { SaveToLibraryDialog } from "@/components/library/save-to-library-dialog";
import { SaveAsTemplateDialog } from "@/components/posts/save-as-template-dialog";
import { POST_TEMPLATES_ENABLED } from "@/lib/feature-flags";
import { PublishPreviewDialog } from "@/components/posts/publish-preview-dialog";
import { ImageUpload } from "@/components/posts/image-upload";
import { ImageViewer } from "@/components/posts/image-viewer";
import { GenerateImageDialog } from "@/components/posts/generate-image-dialog";
import { ImageVersionPicker } from "@/components/posts/image-version-picker";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { openLinkedInShare } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";
import { LINKEDIN, POST_STATUSES, AUTOSAVE_DEBOUNCE_MS, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EDITOR_TOOLTIPS } from "@/lib/tooltip-content";
import { classifyPillar } from "@/lib/classify-pillar";
import { hasFeature } from "@/lib/feature-gate";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { PROVIDER_DISPLAY_NAMES, type AIProvider } from "@/lib/ai/providers";
import { toast } from "sonner";
import { GenerateIdeasDialog } from "@/components/ideas/generate-ideas-dialog";
import { PostStatusPipeline } from "@/components/posts/post-status-pipeline";
import { EditorToolbar } from "@/components/posts/editor-toolbar";
import { PostActions } from "@/components/posts/post-actions";
import { SlashCommandMenu, type SlashCommandMenuHandle } from "@/components/posts/slash-command-menu";
import { detectSlashAtCaret, type SlashCommand } from "@/lib/slash-commands";
import { StudioAIStatusPill, StudioAIMuteToggle } from "@/components/posts/studio-ai-status-pill";
import { StudioAICards } from "@/components/posts/studio-ai-cards";
import { useDraftReview } from "@/lib/ai/use-draft-review";
import { useEmDashAllowed } from "@/lib/use-em-dash";
import { Switch } from "@/components/ui/switch";
import { AssignPost } from "@/components/posts/assign-post";
import { CommentsPanel } from "@/components/posts/comments-panel";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ApprovalControls } from "@/components/posts/approval-controls";
import { SubmitForReviewDialog } from "@/components/posts/submit-for-review-dialog";
import { logActivity } from "@/lib/activity";
import { maybeWriteAutoSnapshot } from "@/lib/autosave-snapshot";
import { diffEdits } from "@/lib/ai/diff-edits";
import {
  ENHANCEMENT_TEMPLATE_LIST,
  type EnhancementTemplateKey,
} from "@/lib/ai/enhancement-templates";
// Tutorial target IDs on elements are used by the tutorial overlay
import type { Post, PostVersion, AIMessage, AIConversation, UserProfile } from "@/types";

// ─── Quick suggestion chips for the AI chat ───────────────────────────────────
// Slash-command hints displayed under the chat input. Not interactive —
// just a visual cue that the chat accepts the same slash commands as the
// editor. Trimmed to 3 examples to keep the hint line compact.
const CHAT_SLASH_HINTS = ["/hook", "/shorten", "/personal"] as const;

// ─── Character counter color helper ───────────────────────────────────────────
function charCountColor(count: number): string {
  if (count > 2900) return "text-red-600";
  if (count >= 2500) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Conditional wrapper for the AI / Comments / Activity right-panel content.
 *
 * On mobile (<lg per `isMobile`) the panel renders inside a bottom-sheet
 * that slides up over the editor — the editor stays visible behind a scrim
 * so summoning the AI no longer feels like leaving the page. Owner direction
 * 2026-05-06: Path A from BP-143 §3 (shadcn Sheet now; vaul drag-snap is a
 * follow-up if the basic slide-up isn't good enough).
 *
 * On desktop the panel keeps its existing inline column placement —
 * primary-tinted, border-left, ~30% width — unchanged.
 *
 * Children are passed through React's `children`, so the panel content tree
 * is rendered exactly once regardless of which wrapper is active.
 */
function ChatPanelWrap({
  isMobile,
  open,
  onClose,
  children,
}: {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <SheetContent
          side="bottom"
          // showCloseButton={false}: the default shadcn Close X is small,
          // ghost-styled, and easy to miss on a dark mobile background —
          // owner reported users couldn't find a way to dismiss the chat.
          // We render our own visible top strip below: drag-handle pill
          // (mobile-native dismiss affordance) + a labelled Close button.
          showCloseButton={false}
          className="h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>AI Assistant</SheetTitle>
          </SheetHeader>

          {/* Top dismiss strip: tappable drag handle + Close button.
              The whole strip is `onClick={onClose}` so users can also
              tap the empty area around the handle to dismiss. The X
              button stops propagation so it works the same way. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI panel"
            className="relative flex shrink-0 items-center justify-center border-b border-border/60 bg-background py-2.5"
          >
            <div
              className="h-1 w-10 rounded-full bg-muted-foreground/40"
              aria-hidden="true"
            />
            <span
              className="absolute right-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </span>
          </button>

          <div className="flex flex-1 flex-col overflow-hidden min-h-0 p-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <div className="flex flex-col overflow-hidden min-h-0 w-full rounded-l-xl border-l border-primary/20 bg-primary/5 px-4 py-3 ring-1 ring-inset ring-primary/10 lg:w-[30%] xl:w-[25%]">
      {children}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function PostWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = params.id as string;
  const supabase = createClient();

  // ── Post state ────────────────────────────────────────────────────────────
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [status, setStatus] = useState<Post["status"]>("draft");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // BP-139 / UF-005: persistent save indicator. lastSavedAt drives the
  // "Saved · 12s ago" relative timestamp; nowTick is bumped on an interval
  // so the relative string updates without requiring the user to type.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [, setNowTick] = useState(0);
  const [sourceIdea, setSourceIdea] = useState<{ id: string; title: string } | null>(null);

  // ── Version state ─────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<PostVersion | null>(null);
  const [showVersionConfirm, setShowVersionConfirm] = useState(false);
  const [activeVersion, setActiveVersion] = useState<PostVersion | null>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [convertedPostId, setConvertedPostId] = useState<string | null>(null);
  const [deletingVersion, setDeletingVersion] = useState(false);
  // BP-141: show/hide auto-kind snapshots in the version dropdown
  const [showAutoVersions, setShowAutoVersions] = useState(false);

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userTier, setUserTier] = useState<SubscriptionTier>("free");

  // ── Chat state ────────────────────────────────────────────────────────────
  // Right panel state: null = closed, else which tab is showing
  type PanelView = "ai" | "comments" | "activity";
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const chatOpen = panelView !== null; // back-compat alias for existing width-computation code

  // Helper: togglers for the top-bar button and tab headers
  const togglePanel = useCallback(() => {
    setPanelView((prev) => {
      if (prev) return null;
      // Restore last-used view from localStorage, default to "ai"
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("postpilot_panel_view") as PanelView | null;
        if (saved === "ai" || saved === "comments" || saved === "activity") return saved;
      }
      return "ai";
    });
  }, []);

  const setPanelViewPersisted = useCallback((view: PanelView | null) => {
    setPanelView(view);
    if (typeof window !== "undefined" && view) {
      localStorage.setItem("postpilot_panel_view", view);
    }
  }, []);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);

  // Per-session provider+model override for the chat panel — owner
  // direction 2026-05-07. Lets users switch which configured provider
  // handles a chat without leaving the editor / opening Settings.
  // null = use the user's default (resolveAi falls back to user_profiles).
  // Initialized below from the user's currently-active text provider
  // once the profile loads.
  const [chatProvider, setChatProvider] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState<string | null>(null);
  // Available text providers + models for the dropdowns. Loaded on
  // first chat panel open via /api/settings/provider-keys?keyType=text
  // + /api/models?kind=text.
  const [chatProviderOptions, setChatProviderOptions] = useState<
    Array<{ slug: string; label: string; modelId: string | null }>
  >([]);
  const [chatModelsByProvider, setChatModelsByProvider] = useState<
    Record<string, { models: Array<{ value: string; label: string }>; defaultModel: string }>
  >({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Studio AI Phase 1 — silent Develop-into-Post handoff state. The AI
  // generates the initial draft via /api/ai/draft (not the chat path);
  // the chat shows a single non-bubble system row instead of a message.
  const [draftingFromIdea, setDraftingFromIdea] = useState(false);
  const [chatSystemEvent, setChatSystemEvent] = useState<string | null>(null);

  // Em-dash preference — when off, every AI request body carries
  // allowEmDashes:false and the server appends a suppression rule to
  // the system prompt.
  const [emDashAllowed, setEmDashAllowed] = useEmDashAllowed();

  // Content snapshot at the moment of the last chat send. The next message
  // diffs against this so the AI sees what the user edited between turns.
  // Seeded on post load and re-set after each send.
  const lastAiSnapshotRef = useRef<string>("");

  // ── Hashtag state ─────────────────────────────────────────────────────────
  const [suggestingHashtags, setSuggestingHashtags] = useState(false);

  // ── LinkedIn publishing state ──────────────────────────────────────────
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Preview, schedule, share & delete state ─────────────────────────────
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markPostedOpen, setMarkPostedOpen] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const [saveToLibraryOpen, setSaveToLibraryOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // ── Content pillar state ──────────────────────────────────────────────────
  const [contentPillars, setContentPillarsState] = useState<string[]>([]);

  // ── Image state ─────────────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generateImageOpen, setGenerateImageOpen] = useState(false);
  // Bumped each time the Generate Image dialog closes so the
  // ImageVersionPicker re-fetches and surfaces any newly-created
  // versions even when the user didn't click "Save and use" — owner
  // direction 2026-05-07. Generated images persist as version rows
  // server-side regardless of the picker action; the strip just needs
  // to be told to reload.
  const [imageVersionsRefreshKey, setImageVersionsRefreshKey] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // ── Hook analysis state ──────────────────────────────────────────────────
  const [hookAnalysis, setHookAnalysis] = useState<{
    strength: "strong" | "moderate" | "weak";
    score: number;
    technique: string;
    feedback: string;
    suggestion?: string;
  } | null>(null);
  const [analyzingHook, setAnalyzingHook] = useState(false);

  // ── Guided enhancement state (BP-028) ────────────────────────────────────
  const [enhancing, setEnhancing] = useState(false);
  const [enhancingTemplate, setEnhancingTemplate] = useState<EnhancementTemplateKey | null>(null);

  // ── Brainstorm state ─────────────────────────────────────────────────────
  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [brainstormTopic, setBrainstormTopic] = useState("");
  const [selectionFloatPos, setSelectionFloatPos] = useState<{x: number, y: number} | null>(null);

  // Tutorial target IDs on elements are used by the tutorial overlay

  // ── Chat provider/model options loader ──────────────────────────────────
  // Pulls available BYOK text providers + the live text-model catalog so
  // the chat header dropdowns can offer them. Lazy: triggered the first
  // time the chat panel opens (no point spending the network round-trip
  // for users who never use chat).
  useEffect(() => {
    if (panelView !== "ai") return;
    if (chatProviderOptions.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [keysRes, modelsRes, providersRes] = await Promise.all([
          fetch("/api/settings/provider-keys?keyType=text"),
          fetch("/api/models?kind=text"),
          fetch("/api/providers"),
        ]);
        if (cancelled) return;
        const keysJson = keysRes.ok ? await keysRes.json() : { keys: [] };
        const modelsJson: Record<string, { models: Array<{ value: string; label: string }>; defaultModel: string }> = modelsRes.ok ? await modelsRes.json() : {};
        const providersJson = providersRes.ok ? (await providersRes.json()).providers ?? [] : [];

        const providerLabel = (slug: string) =>
          (providersJson as Array<{ slug: string; label: string }>).find((p) => p.slug === slug)?.label ?? slug;

        const opts = (keysJson.keys ?? []).map(
          (k: { provider: string; model_id: string | null }) => ({
            slug: k.provider,
            label: providerLabel(k.provider),
            modelId: k.model_id,
          })
        );
        setChatProviderOptions(opts);
        setChatModelsByProvider(modelsJson);
      } catch {
        // Silent — selectors just won't render. The "use my default"
        // path still works because chatProvider/chatModel can stay null.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelView]);

  // ── Responsive: open AI panel on desktop, keep collapsed on mobile ──────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const isLg = window.innerWidth >= 1024; // lg breakpoint
    setIsMobile(!isLg);
    if (isLg) {
      // Restore last-used panel view, or default to AI
      const saved = typeof window !== "undefined" ? localStorage.getItem("postpilot_panel_view") : null;
      if (saved === "ai" || saved === "comments" || saved === "activity") {
        setPanelView(saved);
      } else {
        setPanelView("ai");
      }
    }

    function handleResize() {
      setIsMobile(window.innerWidth < 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Textarea ref for auto-resize and formatting helpers ───────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BP-139: snapshot of the last successfully saved content so we can detect
  // "Unsaved changes" without round-tripping to the DB.
  const savedSnapshotRef = useRef<{
    title: string;
    content: string;
    hashtags: string[];
  } | null>(null);

  // BP-141: track when the last auto-snapshot was written and what content it
  // captured. Both start at values that ensure the first eligible autosave
  // (≥5 min after page load) will snapshot — 0 ms = epoch, empty content.
  const lastAutoSnapshotAtRef = useRef<number>(0);
  const lastAutoSnapshotContentRef = useRef<string>("");

  // ── Blank post detection ────────────────────────────────────────────────
  const isBlankPost =
    (!title.trim() || title.trim() === "Untitled Post") && !content.trim();

  /** Navigate away, but intercept if the post is blank */
  function navigateAway(href: string) {
    if (isBlankPost && status === "draft") {
      setPendingNavigation(href);
      setDiscardDialogOpen(true);
    } else {
      router.push(href);
    }
  }

  async function handleDiscardBlankPost() {
    // Delete the blank post from DB
    await supabase.from("posts").delete().eq("id", postId);
    setDiscardDialogOpen(false);
    router.push(pendingNavigation ?? "/posts");
  }

  function handleKeepBlankPost() {
    // User wants to keep it — close dialog, focus title
    setDiscardDialogOpen(false);
    setPendingNavigation(null);
    // Focus the title input so they can name it
    const titleInput = document.querySelector<HTMLInputElement>('input[placeholder*="title"]');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
    toast.info("Add a title to save this draft.");
  }

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

      // Redirect posted posts to the published view (unless explicitly editing)
      if (p.status === "posted" && searchParams.get("edit") !== "true") {
        router.replace(`/posts/${postId}/published`);
        return;
      }

      setPost(p);
      setTitle(p.title ?? "");
      // Migrate any legacy hashtags array into the body text on first load —
      // hashtags now live inline at the end of the post content. The hashtags
      // column stays in the schema for backward-compat but is no longer
      // populated from this UI.
      const legacyTags = (p.hashtags ?? []).map((t) =>
        t.startsWith("#") ? t : `#${t}`,
      );
      const baseContent = p.content ?? "";
      const tagLine = legacyTags.join(" ");
      const initialContent =
        legacyTags.length > 0 && tagLine && !baseContent.includes(tagLine)
          ? `${baseContent.trimEnd()}\n\n${tagLine}`
          : baseContent;
      setContent(initialContent);
      lastAiSnapshotRef.current = initialContent;
      setHashtags([]);
      setStatus(p.status);
      setContentPillarsState(p.content_pillars ?? []);
      setImageUrl(p.image_url ?? null);

      // BP-138 / UF-004: when arriving via the Edit & Republish flow
      // (?edit=true&republish=1), the post is still 'posted'. Auto-flip it
      // to draft so the editor has a usable status and the user can hit
      // "Publish to LinkedIn" to send the new version when ready.
      if (
        p.status === "posted" &&
        searchParams.get("edit") === "true" &&
        searchParams.get("republish") === "1"
      ) {
        const { error: revertError } = await supabase
          .from("posts")
          .update({
            status: "draft",
            scheduled_for: null,
            scheduled_at: null,
          })
          .eq("id", p.id);
        if (!revertError) {
          setStatus("draft");
        }
      }

      // BP-139: seed the persistent save indicator from the loaded record.
      savedSnapshotRef.current = {
        title: p.title ?? "",
        content: p.content ?? "",
        hashtags: p.hashtags ?? [],
      };
      const updatedAtMs = p.updated_at ? new Date(p.updated_at).getTime() : null;
      setLastSavedAt(updatedAtMs && !Number.isNaN(updatedAtMs) ? updatedAtMs : null);
      setSaveStatus(updatedAtMs ? "saved" : "idle");

      // Fetch the source idea title if this post was developed from one.
      // RLS on `ideas` keeps this scoped to the current user — safe.
      if (p.idea_id) {
        supabase
          .from("ideas")
          .select("id, title")
          .eq("id", p.idea_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setSourceIdea({ id: data.id, title: data.title });
          });
      }
      if (p.scheduled_for) {
        setLastScheduledDate(new Date(p.scheduled_for));
      }
      if (p.scheduled_at) {
        setScheduledAtDate(new Date(p.scheduled_at));
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as UserProfile);
        if (profileData.subscription_tier) {
          setUserTier(profileData.subscription_tier as SubscriptionTier);
        }
        // Seed chat provider/model from the user's active text key.
        // Per-call selectors in the chat header start showing this and
        // the user can switch as needed for the session.
        if (profileData.ai_provider) {
          setChatProvider(profileData.ai_provider as string);
        }
        if (profileData.ai_model) {
          setChatModel(profileData.ai_model as string);
        }
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

  // ── Auto-draft from Idea Bank / Welcome toast for new posts ──────────────
  const ideaAutoTriggered = useRef(false);
  useEffect(() => {
    if (!post?.id || loading || ideaAutoTriggered.current) return;

    const fromIdea = searchParams.get("fromIdea");
    const ideaDescription = searchParams.get("ideaDescription");

    if (fromIdea === "true" && title && !content) {
      ideaAutoTriggered.current = true;
      // Studio AI Phase 1 — silent handoff. Open the panel, kick off draft
      // generation directly against /api/ai/draft, and let
      // silentDraftFromIdea apply the result into the editor when ready.
      setPanelView("ai");
      void silentDraftFromIdea(title, ideaDescription);
      // Clean URL params
      window.history.replaceState({}, "", `/posts/${postId}`);
    } else if (!fromIdea && !content && chatMessages.length === 0) {
      ideaAutoTriggered.current = true;
      toast("Post Pilot AI is ready to help. Ask it to draft, brainstorm, or refine your post anytime.", {
        duration: 6000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, loading]);

  // ── Handle action query params (from card dropdown navigation) ────────────
  const actionHandled = useRef(false);
  useEffect(() => {
    if (!post?.id || loading || actionHandled.current) return;
    const action = searchParams.get("action");
    if (!action) return;

    actionHandled.current = true;
    if (action === "publish") {
      setPublishPreviewOpen(true);
    } else if (action === "schedule") {
      setScheduleDialogOpen(true);
    }
    window.history.replaceState({}, "", `/posts/${postId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, loading]);

  // ── Debounced auto-save ───────────────────────────────────────────────────
  // Throttle activity logging to once per 10 minutes per post
  const lastEditLogRef = useRef<number>(0);
  const EDIT_LOG_THROTTLE_MS = 10 * 60 * 1000;

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
        // BP-139: keep the indicator visible permanently. Snapshot the saved
        // values so the editor can detect future drift as "Unsaved changes",
        // and stamp lastSavedAt for the relative-time string.
        savedSnapshotRef.current = {
          title: newTitle,
          content: newContent,
          hashtags: newHashtags,
        };
        setLastSavedAt(Date.now());
        setSaveStatus("saved");

        // Auto-classify content pillar if not already set
        if (contentPillars.length === 0 && newContent.length >= 100 && profile?.content_pillars?.length) {
          const suggested = classifyPillar(newTitle, newContent, profile.content_pillars);
          if (suggested) {
            updateContentPillars([suggested]);
          }
        }

        // Throttled activity log — only log "edited" once per 10 minutes per session
        const now = Date.now();
        if (post.workspace_id && now - lastEditLogRef.current > EDIT_LOG_THROTTLE_MS) {
          lastEditLogRef.current = now;
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            logActivity(supabase, {
              user_id: authUser.id,
              workspace_id: post.workspace_id,
              post_id: post.id,
              action: "post_edited",
            });
          }
        }

        // BP-141: opportunistically write an auto-kind snapshot if the
        // time-window gate passes. Failures are logged as warnings inside
        // maybeWriteAutoSnapshot and never surfaced to the user.
        const { data: { user: snapshotUser } } = await supabase.auth.getUser();
        if (snapshotUser && newContent.trim()) {
          // Compute the next version number from ALL current versions
          // (manual + auto alike) so numbers stay monotonically increasing.
          const nextNum = versions.length > 0 ? versions[0].version_number + 1 : 1;
          const snapshotWritten = await maybeWriteAutoSnapshot({
            supabase,
            postId: post.id,
            userId: snapshotUser.id,
            title: newTitle,
            content: newContent,
            nextVersionNumber: nextNum,
            lastAutoSnapshotAtRef,
            lastAutoSnapshotContentRef,
          });
          // Re-fetch versions silently only when a snapshot was just written
          if (snapshotWritten) {
            const { data: freshVersions } = await supabase
              .from("post_versions")
              .select("*")
              .eq("post_id", post.id)
              .order("version_number", { ascending: false });
            if (freshVersions) setVersions(freshVersions as PostVersion[]);
          }
        }
      } else {
        // BP-139: surface save failures explicitly instead of silently
        // returning to idle — the persistent indicator now shows "Save failed".
        setSaveStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post, supabase, contentPillars, profile, versions]
  );

  // BP-139: tick the relative-time string every 30s so "Saved · Xs ago"
  // updates without requiring the user to interact.
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // BP-139: derive whether local edits have drifted from the last saved
  // snapshot. Used to render the "Unsaved changes" indicator state.
  const hasUnsavedChanges = (() => {
    const snap = savedSnapshotRef.current;
    if (!snap) return false;
    if (snap.title !== title) return true;
    if (snap.content !== content) return true;
    if (snap.hashtags.length !== hashtags.length) return true;
    for (let i = 0; i < hashtags.length; i++) {
      if (snap.hashtags[i] !== hashtags[i]) return true;
    }
    return false;
  })();

  function formatRelativeSaved(ms: number): string {
    const diff = Math.max(0, Date.now() - ms);
    if (diff < 5_000) return "just now";
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
    return `${Math.floor(diff / (24 * 60 * 60_000))}d ago`;
  }

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

  // ── Slash command state (shared between editor textarea and chat input) ─
  type SlashTarget = "editor" | "chat";
  const [slashState, setSlashState] = useState<{
    open: boolean;
    query: string;
    anchor: { top: number; left: number } | null;
    target: SlashTarget;
    slashIndex: number;
  }>({ open: false, query: "", anchor: null, target: "editor", slashIndex: -1 });
  const slashMenuRef = useRef<SlashCommandMenuHandle>(null);

  /** Re-evaluate whether a slash command is in progress at the caret. */
  function updateSlashFromInput(
    el: HTMLTextAreaElement | HTMLInputElement,
    text: string,
    target: SlashTarget,
  ) {
    const detection = detectSlashAtCaret(text, el.selectionStart ?? 0);
    if (!detection) {
      setSlashState((s) => (s.open ? { ...s, open: false } : s));
      return;
    }
    const rect = el.getBoundingClientRect();
    setSlashState({
      open: true,
      query: detection.query,
      slashIndex: detection.slashIndex,
      // Editor anchors below the caret line (use textarea bottom as fallback);
      // chat input anchors above (placeAbove handled by the menu).
      anchor:
        target === "chat"
          ? { top: rect.top, left: rect.left + 8 }
          : { top: rect.bottom, left: rect.left + 8 },
      target,
    });
  }

  function closeSlashMenu() {
    setSlashState((s) => ({ ...s, open: false }));
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

  // ── Floating brainstorm button on text selection ─────────────────────────
  function handleSelectionChange(e: React.MouseEvent | React.KeyboardEvent) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selected = content.substring(textarea.selectionStart, textarea.selectionEnd);
    if (!selected.trim()) {
      setSelectionFloatPos(null);
      return;
    }
    // Position right at the mouse cursor (most reliable for textareas)
    if ("clientX" in e) {
      setSelectionFloatPos({
        x: e.clientX - 16,
        y: e.clientY - 16,
      });
    } else {
      // Keyboard selection: position near the right edge of the textarea at vertical center
      const rect = textarea.getBoundingClientRect();
      setSelectionFloatPos({
        x: rect.right - 50,
        y: rect.top + rect.height / 2 - 20,
      });
    }
    setBrainstormTopic(selected.trim());
  }

  // Clear float when selection changes to empty or clicking outside
  useEffect(() => {
    if (!selectionFloatPos) return;
    function handleClickAway(e: MouseEvent) {
      const float = document.getElementById("brainstorm-float");
      if (float && float.contains(e.target as Node)) return;
      // Only clear on left-click (button 0), not right-click (button 2)
      if (e.button === 0) {
        setSelectionFloatPos(null);
      }
    }
    window.addEventListener("click", handleClickAway);
    return () => window.removeEventListener("click", handleClickAway);
  }, [selectionFloatPos]);

  // ── Content pillar management ──────────────────────────────────────────
  async function updateContentPillars(pillars: string[]) {
    setContentPillarsState(pillars);
    if (!post) return;
    const { error } = await supabase
      .from("posts")
      .update({
        content_pillars: pillars,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    if (error) {
      toast.error("Failed to update content pillar");
    }
  }

  function toggleContentPillar(pillar: string) {
    const updated = contentPillars.includes(pillar)
      ? contentPillars.filter((p) => p !== pillar)
      : [...contentPillars, pillar];
    updateContentPillars(updated);
  }

  // ── Hashtag management ────────────────────────────────────────────────────
  // Hashtags are now appended to the body text (matches how the AI chat has
  // always inserted them via applyAIContent). The legacy `hashtags` array on
  // the post stays empty going forward; loadPost migrates any prior values.
  async function suggestHashtags() {
    // BP-134: read the textarea directly so we hashtag against the user's
    // latest edits, not stale React state from before the autosave debounce.
    const liveContent = textareaRef.current?.value ?? content;
    if (!liveContent.trim()) return;
    setSuggestingHashtags(true);

    try {
      const response = await fetch("/api/ai/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: liveContent, count: 5 }),
      });

      if (await maybeHandleQuotaExceeded(response)) return;
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
      if (suggested.length === 0) return;

      const tagLine = suggested
        .map((t) => (t.startsWith("#") ? t : `#${t}`))
        .join(" ");

      // Append at the end of the body unless the exact same line is already
      // there. Two newlines for visual separation matches the LinkedIn norm.
      if (liveContent.includes(tagLine)) return;
      const newContent = `${liveContent.trimEnd()}\n\n${tagLine}`;
      if (newContent.length > LINKEDIN.MAX_POST_LENGTH) {
        toast.error("Hashtags would exceed the post length limit.");
        return;
      }
      setContent(newContent);
      scheduleAutoSave(title, newContent, []);
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
  const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);

  async function updateStatus(newStatus: Post["status"]) {
    if (!post) return;

    // Team/workspace mode: moving to "review" requires picking reviewers
    if (newStatus === "review" && post.workspace_id) {
      setReviewerDialogOpen(true);
      return;
    }

    const previousStatus = status;

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
    if (contentPillars.length === 0 && content.length >= 100 && profile?.content_pillars?.length) {
      const suggested = classifyPillar(title, content, profile.content_pillars);
      if (suggested) {
        updates.content_pillars = [suggested];
      }
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", post.id);

    if (!error) {
      setStatus(newStatus);
      if (updates.content_pillars) {
        setContentPillarsState(updates.content_pillars as string[]);
      }

      // Log activity for the status change
      if (authUser) {
        const actionMap: Record<string, "post_status_changed" | "post_archived"> = {
          archived: "post_archived",
        };
        logActivity(supabase, {
          user_id: authUser.id,
          workspace_id: post.workspace_id,
          post_id: post.id,
          action: actionMap[newStatus] ?? "post_status_changed",
          details: { from: previousStatus, to: newStatus },
        });
      }
    }
  }

  // ── Schedule post with date/time ────────────────────────────────────────
  const [lastScheduledDate, setLastScheduledDate] = useState<Date | null>(null);
  const [scheduledAtDate, setScheduledAtDate] = useState<Date | null>(null);

  async function schedulePost(date: Date) {
    if (!post) return;

    // Quota check for scheduled posts
    try {
      const quotaRes = await fetch("/api/quota");
      if (quotaRes.ok) {
        const quota = await quotaRes.json();
        if (quota.scheduled_posts.limit !== -1 && quota.scheduled_posts.used >= quota.scheduled_posts.limit) {
          toast.error(`Monthly scheduling limit reached (${quota.scheduled_posts.used}/${quota.scheduled_posts.limit}). Upgrade your plan for more.`);
          return;
        }
      }
    } catch {}

    const now = new Date();
    const { error } = await supabase
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_for: date.toISOString(),
        scheduled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", post.id);

    if (!error) {
      setStatus("scheduled");
      setLastScheduledDate(date);
      setScheduledAtDate(now);
      setShareDialogOpen(true);

      // Increment scheduling quota
      fetch("/api/quota/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "scheduled_posts" }),
      }).catch(() => {});

      // Log scheduled activity
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        logActivity(supabase, {
          user_id: authUser.id,
          workspace_id: post.workspace_id,
          post_id: post.id,
          action: "post_scheduled",
          details: { scheduled_for: date.toISOString() },
        });
      }
    }
  }

  // ── Share on LinkedIn helper ──────────────────────────────────────────────
  async function analyzeHook() {
    // BP-134: analyze the user's current in-editor text, not the last saved
    // value (the autosave debounce can leave the React state behind).
    const liveContent = textareaRef.current?.value ?? content;
    if (!liveContent.trim() || liveContent.length < 20) {
      toast.info("Write at least a few sentences before analyzing the hook.");
      return;
    }
    setAnalyzingHook(true);
    setHookAnalysis(null);
    try {
      const res = await fetch("/api/ai/analyze-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: liveContent, allowEmDashes: emDashAllowed }),
      });
      if (await maybeHandleQuotaExceeded(res)) {
        setAnalyzingHook(false);
        return;
      }
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

  // ── Guided enhancement (BP-028) ──────────────────────────────────────────
  async function runEnhancement(templateKey: EnhancementTemplateKey) {
    // BP-134 pattern: read live textarea value so we operate on the user's
    // latest edits, not the React state that may lag the autosave debounce.
    const liveContent = textareaRef.current?.value ?? content;
    if (!liveContent.trim()) {
      toast.info("Write some content before enhancing.");
      return;
    }

    setEnhancing(true);
    setEnhancingTemplate(templateKey);

    try {
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: liveContent,
          // instruction is required by the schema; template takes precedence
          // on the server, but we still send a placeholder to satisfy Zod.
          instruction: templateKey,
          template: templateKey,
          allowEmDashes: emDashAllowed,
        }),
      });

      if (await maybeHandleQuotaExceeded(response)) return;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || "Enhancement failed", {
          description: errData.action,
          duration: 8000,
        });
        return;
      }

      if (!response.body) throw new Error("No response body");

      // Stream the result and accumulate
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) accumulated += parsed.text;
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      if (!accumulated.trim()) {
        toast.error("Enhancement returned empty content — try again.");
        return;
      }

      // Parse JSON response (same shape as chat: { content, changesSummary })
      let enhanced = accumulated;
      try {
        const parsed = JSON.parse(accumulated);
        if (parsed.content) {
          enhanced = parsed.content;
        }
      } catch {
        // If not JSON, use raw text directly
      }

      enhanced = enhanced.trim();
      if (!enhanced) {
        toast.error("Enhancement returned empty content — try again.");
        return;
      }

      setContent(enhanced);
      scheduleAutoSave(title, enhanced, hashtags);

      const template = ENHANCEMENT_TEMPLATE_LIST.find((t) => t.key === templateKey);
      toast.success(`"${template?.label ?? templateKey}" applied`);
    } catch (err) {
      console.error("Enhancement error:", err);
      toast.error("Enhancement failed", {
        description: "Check your connection and try again.",
        duration: 8000,
      });
    } finally {
      setEnhancing(false);
      setEnhancingTemplate(null);
    }
  }

  function handleShareOnLinkedIn() {
    if (!post) return;
    // Always open preview dialog to prevent accidental posting
    setPublishPreviewOpen(true);
  }

  /**
   * Slash-command selection handler — strips the typed `/<query>` from the
   * source input and fires the matching action (enhance template or
   * hashtag suggest).
   */
  async function handleSlashSelect(cmd: SlashCommand) {
    const target = slashState.target;
    const slashIndex = slashState.slashIndex;
    const query = slashState.query;

    if (target === "editor") {
      // Strip the literal "/<query>" from the editor content.
      const removeLen = 1 + query.length;
      const before = content.slice(0, slashIndex);
      const after = content.slice(slashIndex + removeLen);
      const cleaned = before + after;
      setContent(cleaned);
      scheduleAutoSave(title, cleaned, hashtags);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          const pos = before.length;
          ta.selectionStart = pos;
          ta.selectionEnd = pos;
          ta.focus();
        }
      });
    } else {
      setChatInput("");
    }
    closeSlashMenu();

    if (cmd.kind === "enhance" && cmd.template) {
      await runEnhancement(cmd.template);
    } else if (cmd.kind === "hashtags") {
      await suggestHashtags();
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
        kind: "manual",
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

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      title: postTitle,
      content: postContent,
      status: "draft" as const,
      hashtags: [],
      character_count: postContent.length,
    };
    if (post?.workspace_id) {
      insertPayload.workspace_id = post.workspace_id;
      insertPayload.assigned_to = user.id;
      insertPayload.assigned_by = user.id;
      insertPayload.assigned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("posts")
      .insert(insertPayload)
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
  async function sendChatMessage(messageText: string, displayText?: string) {
    if (!messageText.trim() || chatStreaming) return;

    // displayText: what the user sees in the chat bubble
    // messageText: what gets sent to the AI (may include hidden instructions)
    const userMessage: AIMessage = {
      role: "user",
      content: displayText ?? messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    // For the API, use the actual instruction text
    const apiMessages = [...chatMessages, { role: "user" as const, content: messageText.trim(), timestamp: userMessage.timestamp }];
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
      // BP-134 / UF-001: read the textarea value directly so the AI always
      // sees the user's latest in-editor edits, not the React state captured
      // by closure at the time autosave last fired (which can lag the
      // 2-second debounce). Falls back to component state if the ref isn't
      // mounted (the AI chat panel can be open before the editor renders).
      const liveContent = textareaRef.current?.value ?? content;

      // Diff vs the snapshot taken at the previous send so the AI knows what
      // the user edited between turns. Empty on the very first message and
      // whenever the user sends without editing.
      const recentEdits = diffEdits(lastAiSnapshotRef.current, liveContent);
      lastAiSnapshotRef.current = liveContent;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          postContent: liveContent,
          postTitle: title,
          postStatus: status,
          contentPillar: contentPillars?.[0] || undefined,
          hashtags: hashtags,
          characterCount: content.length,
          recentEdits: recentEdits || undefined,
          allowEmDashes: emDashAllowed,
          // Per-session provider/model override from the chat panel
          // dropdowns (owner direction 2026-05-07). Sent only when the
          // user picked something — null falls through to user_profiles
          // defaults on the server.
          provider: chatProvider || undefined,
          model: chatModel || undefined,
        }),
      });

      if (await maybeHandleQuotaExceeded(response)) {
        // Strip the optimistic aiMessage placeholder since no response is coming.
        setChatMessages(updatedMessages);
        return;
      }
      if (!response.ok) {
        let errMsg = "Something went wrong with the AI request.";
        let errAction = "Try again. If this keeps happening, check your API key in Settings.";
        let isCreditError = false;
        let billingUrl: string | undefined;
        let providerName: string | undefined;
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
          if (errData.action) errAction = errData.action;
          if (errData.isCreditError) isCreditError = true;
          if (errData.billingUrl) billingUrl = errData.billingUrl;
          if (errData.providerName) providerName = errData.providerName;
        } catch { /* ignore parse failure */ }

        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: isCreditError ? errMsg : `${errMsg}\n\n${errAction}`,
            isCreditError,
            providerName,
            billingUrl,
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

  /**
   * Studio AI Phase 1 — silent Develop-into-Post handoff.
   *
   * Calls /api/ai/draft directly (bypassing the chat path), accumulates
   * the streamed response, and pushes it into the editor via
   * `applyAIContent`. The chat shows only a small system row instead of
   * a visible AI message bubble.
   */
  async function silentDraftFromIdea(ideaTitle: string, ideaDescription: string | null) {
    setDraftingFromIdea(true);
    setChatSystemEvent(null);
    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaTitle,
          ideaDescription: ideaDescription ?? undefined,
          allowEmDashes: emDashAllowed,
        }),
      });

      if (await maybeHandleQuotaExceeded(response)) {
        // Quota gate already toasted the user; surface a chat note too.
        setChatSystemEvent("Couldn't draft from your idea — AI quota reached.");
        return;
      }
      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || "Couldn't draft from your idea.", {
          description: errData.action,
          duration: 8000,
        });
        setChatSystemEvent("Couldn't draft from your idea — try asking in the chat.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) accumulated += parsed.text;
          } catch {
            /* skip malformed SSE chunk */
          }
        }
      }

      // Some providers return JSON wrapped: { content: "..." }
      let drafted = accumulated;
      try {
        const parsed = JSON.parse(accumulated);
        if (parsed.content) drafted = parsed.content;
      } catch {
        /* not JSON — use raw */
      }

      drafted = drafted.trim();
      if (!drafted) {
        setChatSystemEvent("Couldn't draft from your idea — try asking in the chat.");
        return;
      }

      applyAIContent(drafted);
      setChatSystemEvent("Drafted from your idea — edit anything you'd like.");
    } catch (err) {
      console.error("Silent draft handoff failed:", err);
      setChatSystemEvent("Couldn't draft from your idea — try asking in the chat.");
    } finally {
      setDraftingFromIdea(false);
    }
  }

  function applyAIContent(messageContent: string) {
    // Strip common AI preamble patterns before applying to editor
    let cleaned = messageContent;

    // Remove opening filler lines like "Absolutely! Here's your draft:", "Sure, here is...", etc.
    cleaned = cleaned.replace(
      /^(?:(?:absolutely|sure|of course|here(?:'s| is| are)|great|certainly|perfect)[!.,]*[\s]*(?:here(?:'s| is| are))?[^:\n]*[:!.\n]?\s*\n?)+/i,
      ""
    );

    // Remove repeated title at the start (if it matches current title)
    if (title && title !== "Untitled Post") {
      const titlePattern = new RegExp(
        `^\\**${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\**\\s*\\n+`,
        "i"
      );
      cleaned = cleaned.replace(titlePattern, "");
    }

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    setContent(cleaned);
    scheduleAutoSave(title, cleaned, hashtags);
  }

  // ── Studio AI (Phase 1) ──────────────────────────────────────────────────
  // Ambient draft review when the AI panel is open. Hook owns the trigger
  // logic + cache + rate limit + mute. We surface its state into the panel
  // header (StudioAIStatusPill) and render its output as cards above the
  // chat thread.
  const studio = useDraftReview({
    postId,
    content,
    title,
    contentPillar: contentPillars[0],
    panelOpen: panelView === "ai",
    allowEmDashes: emDashAllowed,
  });
  const studioState = draftingFromIdea
    ? "drafting"
    : studio.state;
  const studioExcerpt = (content || "").trim().slice(0, 120);

  /**
   * Splice a Studio AI suggestion into the editor. Hook options always
   * replace the first paragraph; close options replace the last
   * paragraph (action="replace") or append to the end (action="append").
   */
  function applyStudioOption(
    section: "hook" | "close",
    option: { text: string; action: "replace" | "append" },
  ) {
    const live = textareaRef.current?.value ?? content;
    let next = live;
    if (option.action === "append") {
      next = live.trimEnd().length === 0 ? option.text : `${live.trimEnd()}\n\n${option.text}`;
    } else if (section === "hook") {
      const idx = live.indexOf("\n\n");
      next = idx === -1 ? option.text : `${option.text}${live.slice(idx)}`;
    } else {
      // close, replace last paragraph
      const idx = live.lastIndexOf("\n\n");
      next = idx === -1 ? option.text : `${live.slice(0, idx)}\n\n${option.text}`;
    }
    if (next.length > LINKEDIN.MAX_POST_LENGTH) {
      toast.error("That option would exceed the post length limit.");
      return;
    }
    setContent(next);
    scheduleAutoSave(title, next, hashtags);
    lastAiSnapshotRef.current = next;
    toast.success(`${section === "hook" ? "Hook" : "Closing"} applied`);
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

  const charCount = content.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 lg:h-[calc(100vh-7rem)]">
      {/* Left column — header, status pipeline, banners, and the scrolling
          editor body. On desktop (lg+) the AI panel is a sibling column
          so the outer container locks to the viewport height; the body's
          `flex-1` distributes that height between the editor and the panel.
          On mobile/tablet (<lg) the AI panel is a bottom-sheet overlay,
          not a sibling, so the outer height is auto — the editor stack
          sizes to its natural content (title + textarea(min-h-300) +
          action row) instead of stretching to viewport height and leaving
          a large empty gap below the action row. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateAway("/posts")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          {/* Status badge removed — now shown by the inline status pipeline. */}
          {sourceIdea && (
            <Link
              href={`/ideas?highlight=${sourceIdea.id}`}
              className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50 max-w-[240px] truncate"
              title={`Developed from idea: ${sourceIdea.title}`}
            >
              <Lightbulb className="size-3 shrink-0" />
              <span className="truncate">From: {sourceIdea.title}</span>
            </Link>
          )}
          {/* BP-139 / UF-005: persistent save indicator. Always visible
              once a post has loaded; updates via lastSavedAt + a 30s tick
              so the relative-time string stays fresh without typing. */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Saving…</span>
              </>
            ) : saveStatus === "error" ? (
              <>
                <AlertCircle className="size-3 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">
                  Save failed — keep editing to retry
                </span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <CircleDot className="size-3 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">
                  Unsaved changes
                </span>
              </>
            ) : lastSavedAt ? (
              <>
                <Cloud className="size-3" />
                <span>Saved · {formatRelativeSaved(lastSavedAt)}</span>
              </>
            ) : null}
          </div>

          {/* Content pillars moved out of the top header — they now render
              below the post-length indicator, right-aligned. */}
        </div>

        {/* Top-right header strip kept intentionally light — Preview, Schedule,
            and the AI Chat panel toggle now live in the editor's bottom row
            and toolbar respectively. */}
        <div className="flex items-center gap-2" />
      </div>

      {/* Compact status pipeline (replaces the old full-width progress bar). */}
      <div id="tour-progress-bar" className="flex items-center gap-3 pb-1">
        <PostStatusPipeline
          status={status}
          userTier={profile?.subscription_tier as SubscriptionTier ?? userTier}
          scheduledFor={lastScheduledDate}
          scheduledAt={scheduledAtDate}
          createdAt={post?.created_at ? new Date(post.created_at) : null}
          postedAt={post?.posted_at ? new Date(post.posted_at) : null}
          sourceIdeaTitle={sourceIdea?.title ?? null}
        />
      </div>

      {/* Warning banner when editing a published post via ?edit=true */}
      {status === "posted" && searchParams.get("edit") === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">You are editing a published post. Changes here will not update the LinkedIn post.</span>
          <Link
            href={`/posts/${postId}/published`}
            className="shrink-0 inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            Back to Published View
          </Link>
        </div>
      )}

      {/* BP-138 / UF-004: republish banner — shown after the auto-flip from
          posted → draft via ?republish=1. The user came here via the Edit &
          Republish dialog; remind them what's about to happen. */}
      {searchParams.get("republish") === "1" && status === "draft" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span className="flex-1">
            <span className="font-medium">Republishing this post.</span>{" "}
            Your edits will publish as a brand-new post on LinkedIn. The
            original LinkedIn post will not be updated — make sure you&apos;ve
            deleted it there.
          </span>
        </div>
      )}

      {/* Engagement Analytics — posted posts only, below progress bar */}
      {["posted", "archived"].includes(status) && hasFeature(userTier, "analytics") && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Engagement Analytics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {([
              { key: "impressions", label: "Impressions" },
              { key: "reactions", label: "Reactions" },
              { key: "comments_count", label: "Comments" },
              { key: "reposts", label: "Reposts" },
              { key: "engagements", label: "Engagements" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] text-muted-foreground">{label}</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                  value={(post as unknown as Record<string, unknown>)[key] as number ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                    setPost({ ...post!, [key]: val });
                  }}
                  onBlur={async (e) => {
                    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                    await supabase
                      .from("posts")
                      .update({ [key]: val, updated_at: new Date().toISOString() })
                      .eq("id", post!.id);
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {["posted", "archived"].includes(status) && !hasFeature(userTier, "analytics") && (
        <div className="rounded-lg border bg-card p-4">
          <UpgradePrompt feature="Engagement Analytics" requiredTier="personal" variant="inline" />
        </div>
      )}

      {/* Team features: assignment + approval — Team/Enterprise tier + workspace only */}
      {post?.workspace_id && hasFeature(userTier, "workspaces") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Assignment badge */}
          <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Assignment
            </div>
            <AssignPost
              postId={post.id}
              workspaceId={post.workspace_id}
              assignedTo={post.assigned_to ?? null}
              currentUserId={post.user_id}
            />
          </div>

          {/* Approval status at a glance */}
          <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Approval
            </div>
            <span className="text-xs">
              {post.approval_status === "pending" && <span className="text-amber-600 dark:text-amber-400">In review</span>}
              {post.approval_status === "approved" && <span className="text-green-600 dark:text-green-400">Approved</span>}
              {post.approval_status === "changes_requested" && <span className="text-red-600 dark:text-red-400">Changes requested</span>}
              {!post.approval_status && <span className="text-muted-foreground">Not submitted</span>}
            </span>
          </div>
        </div>
      )}

      {/* Full approval controls — Team/Enterprise tier only */}
      {post?.workspace_id && hasFeature(userTier, "workspaces") && (
        <ApprovalControls
          postId={post.id}
          workspaceId={post.workspace_id}
          currentUserId={post.user_id}
          postStatus={status}
          approvalStatus={post.approval_status ?? null}
          approvalStage={post.approval_stage ?? null}
          onChange={() => window.location.reload()}
        />
      )}

      {/* Scheduled status clarification banner */}
      {(status === "scheduled" || status === "past_due") && lastScheduledDate && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 px-3 py-2 mb-3 text-sm text-purple-700 dark:text-purple-300">
          <CalendarClock className="size-4 shrink-0" />
          <span className="flex-1">
            {status === "past_due" ? "This post was scheduled for" : "This post has not been published to LinkedIn yet. It will be automatically published on"}{" "}
            <strong>
              {lastScheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </strong>{" "}
            at{" "}
            <strong>
              {lastScheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </strong>
            {status === "past_due" ? " but was not published." : "."}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900"
            onClick={() => setScheduleDialogOpen(true)}
          >
            <CalendarClock className="size-3.5" />
            Reschedule
          </Button>
        </div>
      )}

      {/* Editor body — scrolling region inside the left column. Width is
          set on the parent (left column flex-1); the AI panel takes its
          fixed % alongside. */}
      <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
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
            <div id="tour-editor-content" className="flex-1 flex">
              {!content.trim() ? (
                <div className="flex min-h-[300px] w-full flex-1 flex-col items-center justify-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Start typing below or let AI draft something for you.
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      handleContentChange(e.target.value);
                      updateSlashFromInput(e.target, e.target.value, "editor");
                    }}
                    onKeyDown={(e) => {
                      if (slashState.open && slashMenuRef.current?.handleKey(e)) return;
                      handleTextareaKeyDown(e);
                    }}
                    onMouseUp={(e) => {
                      handleSelectionChange(e);
                      updateSlashFromInput(e.currentTarget, e.currentTarget.value, "editor");
                    }}
                    onKeyUp={(e) => {
                      handleSelectionChange(e);
                      updateSlashFromInput(e.currentTarget, e.currentTarget.value, "editor");
                    }}
                    onBlur={closeSlashMenu}
                    placeholder="Start writing your LinkedIn post..."
                    className="min-h-[100px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    handleContentChange(e.target.value);
                    updateSlashFromInput(e.target, e.target.value, "editor");
                  }}
                  onKeyDown={(e) => {
                    if (slashState.open && slashMenuRef.current?.handleKey(e)) return;
                    handleTextareaKeyDown(e);
                  }}
                  onMouseUp={(e) => {
                    handleSelectionChange(e);
                    updateSlashFromInput(e.currentTarget, e.currentTarget.value, "editor");
                  }}
                  onKeyUp={(e) => {
                    handleSelectionChange(e);
                    updateSlashFromInput(e.currentTarget, e.currentTarget.value, "editor");
                  }}
                  onBlur={closeSlashMenu}
                  placeholder="Start writing your LinkedIn post..."
                  className="min-h-[300px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                />
              )}
            </div>

            {/* Single icon-only editor toolbar — centered, larger touch
                targets. Sits directly under the editor, above the post-length
                indicator. */}
            <div className="flex justify-center">
              <EditorToolbar
                onInsertEmoji={(emoji) => insertAtCursor(emoji)}
                onInsertBulletList={() => insertAtCursor("\n• ")}
                onInsertNumberedList={() => insertAtCursor("\n1. ")}
                onSuggestHashtags={suggestHashtags}
                hashtagsBusy={suggestingHashtags}
                hashtagsDisabled={!content.trim()}
                hashtagsDisabledReason="Write some content first"
                onSaveToLibrary={() => setSaveToLibraryOpen(true)}
                saveToLibraryDisabled={!hasFeature(userTier, "content_library") || !content.trim()}
                saveToLibraryDisabledReason={
                  !hasFeature(userTier, "content_library")
                    ? "Personal plan or above required"
                    : "Write some content first"
                }
                onRunEnhancement={runEnhancement}
                enhancing={enhancing}
                enhancingTemplate={enhancingTemplate}
                enhanceDisabled={!content.trim()}
                enhanceDisabledReason="Write some content first"
                onToggleAIChat={togglePanel}
                aiChatOpen={chatOpen}
              />
            </div>

            {/* Post length indicator
                Bar first, with a small caption that names what it shows.
                The yellow tick marks the hook truncation point on LinkedIn. */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Post length</span>
                <span className="text-muted-foreground/70 normal-case font-normal tracking-normal text-[11px]">
                  Yellow line = hook cutoff at {LINKEDIN.HOOK_VISIBLE_LENGTH} chars
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                {charCount > 0 && (
                  <div
                    className="h-full rounded-full bg-primary/40 transition-all"
                    style={{
                      width: `${Math.min((charCount / LINKEDIN.MAX_POST_LENGTH) * 100, 100)}%`,
                    }}
                  />
                )}
                <div
                  className="absolute top-0 h-full w-px bg-yellow-500"
                  style={{
                    left: `${(LINKEDIN.HOOK_VISIBLE_LENGTH / LINKEDIN.MAX_POST_LENGTH) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium tabular-nums", charCountColor(charCount))}>
                  {charCount} / {LINKEDIN.MAX_POST_LENGTH} chars
                </span>
                {charCount > LINKEDIN.HOOK_VISIBLE_LENGTH && (
                  <span className="text-yellow-600 dark:text-yellow-500">
                    Hook ends at char {LINKEDIN.HOOK_VISIBLE_LENGTH}
                  </span>
                )}
              </div>

              {/* Content pillars — moved out of the top header per spec. */}
              {(contentPillars.length > 0 || (status === "posted" && (profile?.content_pillars?.length ?? 0) > 0)) && (
                <div className="flex justify-end">
                  {status === "posted" && (profile?.content_pillars?.length ?? 0) > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
                          />
                        }
                      >
                        <Tag className="size-3" />
                        {contentPillars.length > 0 ? contentPillars.join(", ") : "Assign pillar"}
                        <ChevronDown className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-auto whitespace-nowrap">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Content Pillars</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {profile!.content_pillars.map((pillar) => (
                            <DropdownMenuItem
                              key={pillar}
                              onClick={() => toggleContentPillar(pillar)}
                            >
                              {contentPillars.includes(pillar) && (
                                <Check className="size-3.5 mr-1.5" />
                              )}
                              {pillar}
                            </DropdownMenuItem>
                          ))}
                          {contentPillars.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateContentPillars([])}>
                                <X className="size-3.5 mr-1.5" />
                                Remove all pillars
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-1">
                      {contentPillars.map((pillar) => (
                        <Badge key={pillar} variant="outline" className="gap-1 text-xs">
                          <Tag className="size-3" />
                          {pillar}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hook analysis card */}
            {hookAnalysis && (
              <div className={cn(
                "rounded-lg border p-3 text-sm",
                hookAnalysis.strength === "strong" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
                hookAnalysis.strength === "moderate" && "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
                hookAnalysis.strength === "weak" && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
              )}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className={cn(
                      "size-3.5",
                      hookAnalysis.strength === "strong" && "text-green-600 dark:text-green-400",
                      hookAnalysis.strength === "moderate" && "text-yellow-600 dark:text-yellow-400",
                      hookAnalysis.strength === "weak" && "text-red-600 dark:text-red-400",
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

            <Separator />

            {/* Post Image — distinct visual treatment so it stands out from
                the rest of the editor body. Subtle primary-tinted gradient
                surface; primary CTA is the AI-generate button. */}
            <div
              id="tour-image-section"
              className="space-y-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-3 ring-1 ring-inset ring-primary/5"
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <ImagePlus className="size-4" />
                Post Image
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ImageUpload
                  postId={postId}
                  imageUrl={imageUrl}
                  onImageChange={setImageUrl}
                  inline
                />
                <div className="flex-1" />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setGenerateImageOpen(true)}
                        disabled={!hasFeature(userTier, "image_generation") || !content.trim()}
                      />
                    }
                  >
                    <Sparkles className="size-3.5" />
                    {imageUrl ? "Replace with AI" : "Generate with AI"}
                  </TooltipTrigger>
                  {!hasFeature(userTier, "image_generation") && (
                    <TooltipContent>Personal plan or above required</TooltipContent>
                  )}
                </Tooltip>
              </div>
              {imageUrl && (
                <>
                  {/* Side-by-side layout: vertical history strip on the
                      left, active image filling the remaining horizontal
                      space on the right. Owner direction 2026-05-07:
                      stop centering the image with empty side gutters
                      and stop pushing history below — uses the editor
                      column's full width more deliberately. The picker
                      returns null when ≤1 versions exist, so the image
                      naturally takes 100% width on first generation. */}
                  <div className="flex items-start gap-3">
                    <ImageVersionPicker
                      postId={postId}
                      currentImageUrl={imageUrl}
                      onImageChange={setImageUrl}
                      refreshKey={imageVersionsRefreshKey}
                      orientation="vertical"
                    />
                    <img
                      src={imageUrl}
                      alt="Post image"
                      className="flex-1 min-w-0 max-h-80 rounded-lg border object-contain bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setImageViewerOpen(true)}
                      title="Click to view full resolution"
                    />
                  </div>
                  <ImageViewer
                    open={imageViewerOpen}
                    onOpenChange={setImageViewerOpen}
                    imageUrl={imageUrl}
                  />
                </>
              )}
            </div>

            <Separator />

            {/* Hashtags now live inline at the end of the body text. The
                # toolbar icon and /hashtags slash command append directly. */}

            {/* Bottom action row — Versions on the far left, then on the
                right: Submit-for-Review (when applicable), 3-dot Actions
                menu, Preview, Schedule. Mirrors the new mockup.
                Wrapper id `tour-bottom-actions` is the anchor for the
                howto-develop-idea.dev-publish tutorial step. */}
            <div id="tour-bottom-actions" className="flex items-center gap-2 pb-2">
              {/* Versions dropdown — far left */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button id="tour-versions-menu" variant="outline" size="sm" className="gap-1.5" />}
                >
                  <Save className="size-3.5" />
                  <span className="sr-only md:not-sr-only">Versions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 whitespace-normal">
                  {/* BP-037: Sub-text under each version action so users know
                      these are drafting/saving actions — NOT publishing to LinkedIn. */}

                  <DropdownMenuItem onClick={saveVersion} disabled={savingVersion || !content.trim()}>
                    <Save className="size-3.5 mr-2 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span>Save Version</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Snapshot this draft so you can return to it later
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => createPostFromVersion(activeVersion ?? undefined)}
                    disabled={!content.trim()}
                  >
                    <FilePlus2 className="size-3.5 mr-2 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span>Save as New Post</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Create a separate post in PostPilot from this content. Does not publish to LinkedIn.
                      </span>
                    </div>
                  </DropdownMenuItem>
                  {/* Post Templates suppressed until GTM — POST_TEMPLATES_ENABLED
                      gates the menu item here, the dialog mount below, and
                      every other Templates surface. */}
                  {POST_TEMPLATES_ENABLED && (
                    <DropdownMenuItem onClick={() => setSaveAsTemplateOpen(true)} disabled={!content.trim()}>
                      <Tag className="size-3.5 mr-2 mt-0.5 shrink-0" />
                      <div className="flex flex-col flex-1">
                        <span>Save as Template</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          Reuse this structure as a starting point for future posts
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {versions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="flex items-center justify-between px-1.5 py-1">
                        <span className="text-xs font-medium text-muted-foreground">Version History</span>
                        {/* BP-141: toggle visibility of auto-kind snapshots */}
                        {versions.some((v) => v.kind === "auto") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowAutoVersions((prev) => !prev);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showAutoVersions ? "Hide autosaves" : "Show autosaves"}
                          </button>
                        )}
                      </div>
                      {versions
                        .filter((v) => showAutoVersions || v.kind !== "auto")
                        .map((v) => (
                          <DropdownMenuItem
                            key={v.id}
                            onClick={() => requestLoadVersion(v)}
                            className={cn(activeVersion?.id === v.id && "bg-accent font-semibold")}
                          >
                            <div className="flex w-full flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {v.kind === "auto"
                                    ? `Autosave · ${new Date(v.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                                    : (v.label ?? `Version ${v.version_number}`)}
                                </span>
                                {activeVersion?.id === v.id && <Check className="size-3.5 text-primary" />}
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Right-side cluster — pushes everything below to the right */}
              <div className="ml-auto flex items-center gap-2">
                {/* Submit for Review — Team/Enterprise + workspace only */}
                {post?.workspace_id && hasFeature(userTier, "workspaces") && status === "draft" && post.approval_status !== "pending" && (
                  <Button
                    onClick={() => setReviewerDialogOpen(true)}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Send className="size-3.5" />
                    <span className="sr-only md:not-sr-only">Submit for Review</span>
                  </Button>
                )}

                {/* 3-dot Actions — Post Now / View on LinkedIn / Posted Manually / Archive / Delete */}
                <PostActions
                  postId={postId}
                  status={status}
                  title={title}
                  variant="editor"
                  userTier={userTier}
                  linkedinPostUrl={post?.linkedin_post_url}
                  onPostNow={handleShareOnLinkedIn}
                />

                {/* Preview */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setPublishPreviewOpen(true)}
                      >
                        <Eye className="size-3.5" />
                        <span className="sr-only md:not-sr-only">Preview</span>
                      </Button>
                    }
                  />
                  <TooltipContent>{EDITOR_TOOLTIPS.preview.text}</TooltipContent>
                </Tooltip>

                {/* Schedule */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setScheduleDialogOpen(true)}
                        disabled={status === "archived"}
                      >
                        <CalendarClock className="size-3.5" />
                        <span className="sr-only md:not-sr-only">Schedule</span>
                      </Button>
                    }
                  />
                  <TooltipContent>{EDITOR_TOOLTIPS.schedule.text}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Engagement Analytics moved to below progress bar */}
          </div>
        </div>
      </div>

        {/* Mobile-only AI FAB — opens the chat panel.
            BP-143 placeholder: a circular Bot button summoning the AI.
            Hidden when the panel is already open (would float over its
            own content). Hidden at `md+` because the desktop layout has
            its own panel toggle.

            Positioning: `bottom-32` (128px) clears the editor's bottom
            action row when the user is scrolled to the end of the post
            content. Owner reported the previous `bottom-20` overlapped
            the Schedule button (action row sits at `pb-20 = 80px` from
            viewport bottom, same place the FAB used to anchor — so they
            collided). 128px = 80px (main pb-20) + 28px (action row
            button height) + 20px breathing gap. */}
        {!chatOpen && (
          <button
            type="button"
            onClick={() => setPanelViewPersisted("ai")}
            aria-label="Open AI assistant"
            className={cn(
              "md:hidden",
              "fixed bottom-32 right-4 z-30",
              "mb-[env(safe-area-inset-bottom)]",
              "size-14 rounded-full bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "shadow-lg shadow-primary/20",
              "transition-transform hover:scale-105 active:scale-95"
            )}
          >
            <Bot className="size-6" aria-hidden="true" />
          </button>
        )}

        {/* ─── Right Panel: Post Pilot AI ─── runs from the page top
            because it's a sibling of the entire left column.
            On mobile renders as a bottom-sheet (slide-up over the editor);
            on desktop keeps the inline border-left column. See <ChatPanelWrap />. */}
        {chatOpen && (
          <ChatPanelWrap
            isMobile={isMobile}
            open={chatOpen}
            onClose={() => setPanelViewPersisted(null)}
          >
            {/* Panel tab header — only Team+ users in workspace see Comments/Activity tabs */}
            {post?.workspace_id && hasFeature(userTier, "workspaces") ? (
              <>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex rounded-lg border border-input p-0.5 bg-muted/50 flex-1 max-w-md">
                    <button
                      onClick={() => setPanelViewPersisted("ai")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        panelView === "ai"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Bot className="size-3.5" />
                      Post Pilot AI
                    </button>
                    <button
                      onClick={() => setPanelViewPersisted("comments")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        panelView === "comments"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageCircle className="size-3.5" />
                      Comments
                    </button>
                    <button
                      onClick={() => setPanelViewPersisted("activity")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        panelView === "activity"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Activity className="size-3.5" />
                      Activity
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPanelView(null)}
                    className="ml-2 shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <Separator />
              </>
            ) : (
              /* Single Post Pilot AI header for non-team users */
              <>
                <div className="space-y-2 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
                        <Bot className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          Post Pilot AI
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
                    <div className="flex items-center gap-1.5">
                      {/* Studio AI mute toggle — only shown once Studio AI
                          is reachable (i.e. no gate AND not currently
                          drafting from idea). */}
                      {!studio.gate && !draftingFromIdea && (
                        <StudioAIMuteToggle
                          paused={studio.muted}
                          onToggle={studio.toggleMuted}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPanelView(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Studio AI status — pulsing dot + state label, plus an
                      animated reading bar while a review is in flight. */}
                  {!studio.gate && (
                    <StudioAIStatusPill
                      state={studioState}
                      excerpt={studioExcerpt}
                    />
                  )}

                  {/* Per-session provider+model pickers — owner direction
                      2026-05-07. Renders only when the user has at least
                      one BYOK text key configured (so there's something to
                      switch to). Selecting a different provider or model
                      here applies to subsequent chat sends only; it does
                      NOT change the user's active provider in Settings. */}
                  {chatProviderOptions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                        Using
                      </span>
                      <Select
                        value={chatProvider ?? ""}
                        onValueChange={(v) => {
                          if (!v) return;
                          setChatProvider(v);
                          // Snap model to the provider's saved
                          // preference (or default) so the dropdown
                          // doesn't show a stale model from the
                          // previous provider.
                          const opt = chatProviderOptions.find((p) => p.slug === v);
                          const savedModel = opt?.modelId ?? null;
                          const fallbackModel = chatModelsByProvider[v]?.defaultModel ?? null;
                          setChatModel(savedModel ?? fallbackModel);
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {chatProviderOptions.map((p) => (
                            <SelectItem key={p.slug} value={p.slug} className="text-xs">
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {chatProvider &&
                        (chatModelsByProvider[chatProvider]?.models?.length ?? 0) > 0 && (
                          <Select
                            value={chatModel ?? ""}
                            onValueChange={(v) => {
                              if (v) setChatModel(v);
                            }}
                          >
                            <SelectTrigger className="h-7 w-auto min-w-[160px] text-xs">
                              <SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {chatModelsByProvider[chatProvider].models.map((m) => (
                                <SelectItem
                                  key={m.value}
                                  value={m.value}
                                  className="text-xs"
                                >
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Comments tab content */}
            {panelView === "comments" && post?.workspace_id && hasFeature(userTier, "workspaces") && (
              <div className="flex-1 min-h-0 py-3 overflow-y-auto">
                <CommentsPanel
                  postId={post.id}
                  workspaceId={post.workspace_id}
                  currentUserId={post.user_id}
                />
              </div>
            )}

            {/* Activity tab content */}
            {panelView === "activity" && post?.workspace_id && hasFeature(userTier, "workspaces") && (
              <div className="flex-1 min-h-0 py-3 overflow-y-auto">
                <ActivityFeed postId={post.id} limit={100} title="Post Timeline" />
              </div>
            )}

            {/* AI Assistant tab content — only shown when panelView is "ai" */}
            {panelView === "ai" && (
            <>
            {/* Studio AI surfaces — gate message OR suggestion cards. Sit
                above the chat thread so the user sees them first. */}
            {studio.gate ? (
              <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                <p className="font-semibold text-primary">
                  {studio.gate === "tier_gate" ? "Advanced Insights is a Pro feature" : "Add your AI key to unlock Advanced Insights"}
                </p>
                {studio.gateMessage && (
                  <p className="mt-1 text-muted-foreground">{studio.gateMessage}</p>
                )}
                <Link
                  href={studio.gate === "tier_gate" ? "/pricing" : "/settings"}
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {studio.gate === "tier_gate" ? "See plans →" : "Open Settings →"}
                </Link>
              </div>
            ) : studio.review ? (
              <div className="mb-3">
                <StudioAICards
                  postId={postId}
                  review={studio.review}
                  onApplyOption={applyStudioOption}
                />
              </div>
            ) : null}

            {/* Chat messages area */}
            <ScrollArea id="tour-ai-chat-area" className="flex-1 min-h-0 py-3">
              <div className="space-y-4 pr-2">
                {/* Single non-bubble system row (e.g. "Drafted from your
                    idea") — sits above any chat bubbles and never
                    re-enters the conversation history. */}
                {chatSystemEvent && (
                  <div className="flex items-center justify-center">
                    <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[10px] italic text-muted-foreground">
                      ✨ {chatSystemEvent}
                    </span>
                  </div>
                )}

                {chatMessages.length === 0 && !chatSystemEvent && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <MessageCircle className="size-5 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm font-medium">Start a conversation</p>
                    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                      Ask Post Pilot AI to help refine your post, suggest hooks, or improve
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
                        {msg.isCreditError ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                              <span className="font-medium">{msg.content}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              To continue using AI tools, visit your provider to purchase more credits, or switch to a different AI provider in Settings.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msg.billingUrl && msg.providerName && (
                                <a
                                  href={msg.billingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                                >
                                  <ExternalLink className="size-3" />
                                  {msg.providerName} Credits
                                </a>
                              )}
                              <a
                                href="/settings"
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                              >
                                Switch Provider
                              </a>
                            </div>
                          </div>
                        ) : (
                          msg.content
                        )}
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
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  id="tour-apply-to-editor"
                                  onClick={() => applyAIContent(msg.content)}
                                  className="mt-2 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                                >
                                  <Sparkles className="size-3" />
                                  Apply to Editor
                                </button>
                              }
                            />
                            <TooltipContent>{EDITOR_TOOLTIPS.applyToEditor.text}</TooltipContent>
                          </Tooltip>
                        )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Chat input */}
            <div className="flex items-end gap-2 pb-1">
              <textarea
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  updateSlashFromInput(e.target, e.target.value, "chat");
                }}
                onKeyDown={(e) => {
                  if (slashState.open && slashMenuRef.current?.handleKey(e)) return;
                  // Desktop: Enter (no shift) submits the message.
                  // Mobile: Enter inserts a newline. Phone keyboards have
                  // no Shift key, so submit-on-Enter leaves users with no
                  // way to add a line break in their message — owner
                  // direction 2026-05-07. The Send button is the only
                  // submit on mobile.
                  if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    sendChatMessage(chatInput);
                  }
                }}
                onMouseUp={(e) => updateSlashFromInput(e.currentTarget, e.currentTarget.value, "chat")}
                onKeyUp={(e) => updateSlashFromInput(e.currentTarget, e.currentTarget.value, "chat")}
                onBlur={closeSlashMenu}
                placeholder="Ask Post Pilot AI anything, or type / for commands…"
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

            {/* Footer row under the chat input — slash hint on the left,
                em-dash preference toggle on the right. */}
            <div className="flex items-center justify-between gap-3 pt-1.5 pb-1">
              {/* Slash-command hint */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-muted-foreground/80">
                <span>Try</span>
                {CHAT_SLASH_HINTS.map((hint) => (
                  <code
                    key={hint}
                    className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/70"
                  >
                    {hint}
                  </code>
                ))}
                <span>· type / for more</span>
              </div>

              {/* Em-dash toggle */}
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground/80"
                title={
                  emDashAllowed
                    ? "AI may use em-dashes (—). Toggle off to forbid them."
                    : "AI is instructed to avoid em-dashes (—)."
                }
              >
                <span className="font-mono">em-dash</span>
                <Switch
                  checked={emDashAllowed}
                  onCheckedChange={setEmDashAllowed}
                  className="h-4 w-7"
                />
              </label>
            </div>
            </>
            )}
          </ChatPanelWrap>
        )}

      {/* Schedule dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={schedulePost}
        initialDate={(status === "scheduled" || status === "past_due") ? lastScheduledDate ?? undefined : undefined}
      />

      {/* Submit for Review dialog — opens when user moves post to review in workspace mode */}
      {post?.workspace_id && (
        <SubmitForReviewDialog
          open={reviewerDialogOpen}
          onOpenChange={setReviewerDialogOpen}
          postId={post.id}
          workspaceId={post.workspace_id}
          currentUserId={post.user_id}
          onSubmitted={() => {
            setStatus("review");
            // Refresh to pick up approval_stage / approval_status updates
            window.location.reload();
          }}
        />
      )}

      {/* Schedule confirmation dialog */}
      <LinkedInShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        scheduledFor={lastScheduledDate}
        linkedinConnected={linkedinConnected}
      />

      {/* Mark as Posted dialog */}
      <MarkPostedDialog
        open={markPostedOpen}
        onOpenChange={setMarkPostedOpen}
        postId={postId}
        postTitle={title}
        onSuccess={() => {
          setStatus("posted");
        }}
      />

      {/* Publish preview dialog */}
      <PublishPreviewDialog
        open={publishPreviewOpen}
        onOpenChange={setPublishPreviewOpen}
        postId={postId}
        title={title}
        content={content}
        hashtags={hashtags}
        imageUrl={imageUrl}
        authorName={profile?.full_name ?? "Your Name"}
        authorHeadline={profile?.headline ?? "Your headline"}
        onImageChange={setImageUrl}
        onSchedule={() => setScheduleDialogOpen(true)}
        onPublished={(result) => {
          setStatus("posted");
          if (post) {
            setPost({
              ...post,
              status: "posted",
              linkedin_post_url: result.postUrl,
              linkedin_post_id: result.postId,
            });
          }
        }}
        onTokenExpired={() => setLinkedinConnected(false)}
      />

      {/* Generate Image dialog */}
      <GenerateImageDialog
        open={generateImageOpen}
        onOpenChange={(o) => {
          setGenerateImageOpen(o);
          // When the dialog closes, bump the version-picker's refresh
          // trigger so any images generated this session appear in the
          // history strip — even if the user closed via X without
          // clicking "Save and use." The image rows already exist
          // server-side; the picker just needs to re-fetch.
          if (!o) setImageVersionsRefreshKey((k) => k + 1);
        }}
        postId={postId}
        postTitle={title}
        postContent={content}
        onImageGenerated={setImageUrl}
      />

      {/* Save to Library dialog */}
      <SaveToLibraryDialog
        open={saveToLibraryOpen}
        onOpenChange={setSaveToLibraryOpen}
        initialContent={content}
        contentPillars={profile?.content_pillars ?? []}
      />

      {/* Save as Template dialog — gated by POST_TEMPLATES_ENABLED. */}
      {POST_TEMPLATES_ENABLED && (
        <SaveAsTemplateDialog
          open={saveAsTemplateOpen}
          onOpenChange={setSaveAsTemplateOpen}
          content={content}
          contentPillar={contentPillars[0] ?? null}
        />
      )}

      {/* Discard blank post dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" style={{ maxWidth: "400px" }}>
          <DialogHeader>
            <DialogTitle>Discard blank post?</DialogTitle>
            <DialogDescription>
              This post has no title or content. Would you like to discard it or add a title to keep it as a draft?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleKeepBlankPost}>
              Keep &amp; Add Title
            </Button>
            <Button variant="destructive" onClick={handleDiscardBlankPost}>
              Discard Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Floating brainstorm button on text selection */}
      {selectionFloatPos && (
        <div
          id="brainstorm-float"
          className="fixed z-50 rounded-lg shadow-lg"
          style={{ right: window.innerWidth - selectionFloatPos.x, top: selectionFloatPos.y }}
        >
          <button
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent textarea blur
              autoSave(title, content, hashtags);
              setBrainstormTopic(brainstormTopic);
              setBrainstormOpen(true);
              setSelectionFloatPos(null);
            }}
          >
            <Lightbulb className="size-3.5" />
            Brainstorm
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

      {/* Slash-command autocomplete — anchored to whichever input opened it.
          Editor anchors below the textarea; chat anchors above the input. */}
      <SlashCommandMenu
        ref={slashMenuRef}
        open={slashState.open}
        query={slashState.query}
        anchor={slashState.anchor}
        placeAbove={slashState.target === "chat"}
        onSelect={handleSlashSelect}
        onClose={closeSlashMenu}
      />
    </div>
  );
}
