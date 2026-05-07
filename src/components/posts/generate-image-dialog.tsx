"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, Info, Braces, ChevronLeft, ChevronRight, ChevronDown, Upload, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { maybeHandleQuotaExceeded } from "@/lib/errors/handle-quota-exceeded";
import type { PostImageVersion } from "@/types";

interface GenerateImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string | null;
  postContent: string;
  onImageGenerated: (imageUrl: string) => void;
}

/**
 * Image-provider list and per-provider model catalogs are no longer
 * hardcoded — they come from the BYOK registry (`ai_providers` table)
 * and the live model catalog (`ai_models` via /api/models?kind=image).
 *
 * `ImageProvider` is a string slug now (any provider whose capabilities
 * include 'image'), not a closed enum. Adding a 5th image provider in
 * the future = INSERT INTO ai_providers + register adapter; this dialog
 * picks it up with no edits.
 */
type ImageProvider = string;

interface ImageProviderInfo {
  slug: string;
  label: string;
  models: { value: string; label: string }[];
}

type ImageFormat = "landscape" | "square";

const IMAGE_FORMATS: { value: ImageFormat; label: string; dimensions: string }[] = [
  { value: "landscape", label: "Landscape", dimensions: "1920 × 1080" },
  { value: "square", label: "Square", dimensions: "1080 × 1080" },
];

const ART_STYLES = [
  "Clean, modern corporate illustration",
  "Minimalist flat design",
  "Professional infographic style",
  "Photorealistic",
  "Abstract geometric",
  "Hand-drawn sketch",
  "Isometric 3D illustration",
  "Watercolor painting",
];

export function GenerateImageDialog({
  open,
  onOpenChange,
  postId,
  postTitle,
  postContent,
  onImageGenerated,
}: GenerateImageDialogProps) {
  const hook = postContent.slice(0, 210);
  const defaultPrompt = `Generate an image for a social media post. The image should visually represent the mood, energy, and themes of this topic — do NOT render the topic text itself in the image. Topic: ${postTitle || "a LinkedIn post"}. Thematic context: ${hook}`;

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("landscape");
  const [artStyle, setArtStyle] = useState(ART_STYLES[0]);
  const [includeText, setIncludeText] = useState(false);
  const [imageText, setImageText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Versioning state
  const [versions, setVersions] = useState<PostImageVersion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPostImagePath, setCurrentPostImagePath] = useState<string | null>(null);
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Provider state
  const [provider, setProvider] = useState<ImageProvider | null>(null);
  const [model, setModel] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<ImageProvider[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Per-provider info (label + image model catalog) sourced from
  // /api/providers + /api/models?kind=image.
  const [providerInfo, setProviderInfo] = useState<Record<string, ImageProviderInfo>>({});

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt);
      if (!configLoaded) loadConfig();
      loadVersions();
    } else {
      setVersionsLoaded(false);
    }
  }, [open]);

  async function loadConfig() {
    try {
      // SECURITY: all provider key lookups go through the safe metadata API.
      // Never fetch ciphertext columns from the browser.
      const [providersRes, imageModelsRes, imageRes, textRes] = await Promise.all([
        fetch("/api/providers"),
        fetch("/api/models?kind=image"),
        fetch("/api/settings/provider-keys?keyType=image"),
        fetch("/api/settings/provider-keys?keyType=text"),
      ]);

      const providersJson = providersRes.ok
        ? (await providersRes.json()).providers ?? []
        : [];
      const capable = (providersJson as Array<{
        slug: string;
        label: string;
        capabilities: string[];
      }>)
        .filter((p) => p.capabilities?.includes("image"))
        .map((p) => p.slug);

      const modelsJson: Record<string, { models: { value: string; label: string }[] }> =
        imageModelsRes.ok ? await imageModelsRes.json() : {};
      const info: Record<string, ImageProviderInfo> = {};
      for (const p of providersJson as Array<{ slug: string; label: string }>) {
        if (!capable.includes(p.slug)) continue;
        info[p.slug] = {
          slug: p.slug,
          label: p.label,
          models: modelsJson[p.slug]?.models ?? [],
        };
      }
      setProviderInfo(info);

      const imageKeys: Array<{ provider: string; is_active: boolean }> =
        imageRes.ok ? (await imageRes.json()).keys ?? [] : [];
      const textKeys: Array<{ provider: string; is_active: boolean }> =
        textRes.ok ? (await textRes.json()).keys ?? [] : [];

      const available: ImageProvider[] = [];

      // Image-specific keys take priority.
      for (const key of imageKeys) {
        if (capable.includes(key.provider) && !available.includes(key.provider)) {
          available.push(key.provider);
        }
      }

      // Fall back to text keys for image-capable providers — same key
      // works for both at the provider level (OpenAI, Google).
      for (const key of textKeys) {
        if (capable.includes(key.provider) && !available.includes(key.provider)) {
          available.push(key.provider);
        }
      }

      setConfiguredProviders(available);

      // Prefer the active image key, then active text key, then first available.
      const activeImageKey = imageKeys.find((k) => k.is_active);
      const activeTextKey = textKeys.find(
        (k) => k.is_active && capable.includes(k.provider)
      );

      const pick =
        activeImageKey?.provider ||
        activeTextKey?.provider ||
        available[0];

      if (pick && available.includes(pick)) {
        setProvider(pick);
        const firstModel = info[pick]?.models[0]?.value ?? "";
        setModel(firstModel);
      } else {
        setProvider(null);
      }
    } catch {
      // Silently fail — UI surfaces "no providers configured" empty state.
    }

    setConfigLoaded(true);
  }

  async function loadVersions() {
    try {
      // Fetch versions and current post image path in parallel
      const [versionsRes, postRes] = await Promise.all([
        fetch(`/api/posts/image-versions?postId=${postId}`),
        supabase
          .from("posts")
          .select("image_storage_path")
          .eq("id", postId)
          .single(),
      ]);

      if (versionsRes.ok) {
        const { versions: v } = await versionsRes.json();
        setVersions(v ?? []);
        // Select the version that matches the post's current image, or default to first
        const currentPath = postRes.data?.image_storage_path;
        setCurrentPostImagePath(currentPath ?? null);
        if (currentPath && v?.length) {
          const idx = v.findIndex((ver: PostImageVersion) => ver.storage_path === currentPath);
          setSelectedIndex(idx >= 0 ? idx : 0);
        } else {
          setSelectedIndex(0);
        }
      }
    } catch {
      // Silently fail — versions just won't show
    }
    setVersionsLoaded(true);
  }

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  function handleProviderChange(p: ImageProvider) {
    setProvider(p);
    const firstModel = providerInfo[p]?.models[0]?.value ?? "";
    setModel(firstModel);
  }

  const currentModels = provider ? providerInfo[provider]?.models ?? [] : [];
  const availableProviders = configuredProviders;
  const selectedVersion = versions[selectedIndex] ?? null;

  async function handleGenerate() {
    if (!provider) {
      toast.error("No image-capable AI provider configured. Please update your settings.");
      return;
    }

    // Create a fresh AbortController for this generation
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          prompt,
          artStyle,
          imageFormat,
          includeText,
          imageText: includeText ? imageText : undefined,
          imageProvider: provider,
          imageModel: model,
        }),
        signal: controller.signal,
      });

      if (await maybeHandleQuotaExceeded(res)) return;

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to generate image", { duration: 8000 });
        return;
      }

      // Prepend new version and select it
      const newVersion: PostImageVersion = {
        id: data.versionId,
        post_id: postId,
        user_id: "",
        storage_path: data.storagePath,
        image_url: data.imageUrl,
        prompt: data.prompt,
        source: "ai",
        created_at: new Date().toISOString(),
      };
      setVersions((prev) => [newVersion, ...prev]);
      setSelectedIndex(0);
      // Scroll thumbnails to start
      if (thumbnailsRef.current) {
        thumbnailsRef.current.scrollLeft = 0;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User-initiated cancel — show neutral toast, do not show error
        toast.info("Image generation canceled.");
        return;
      }
      toast.error("Failed to generate image. Check your AI provider settings.");
    } finally {
      abortControllerRef.current = null;
      setGenerating(false);
    }
  }

  function getFullPrompt() {
    const fmt = imageFormat === "square"
      ? "square format (1:1, 1080x1080)"
      : "landscape format (16:9, 1920x1080)";
    const textInstruction = includeText && imageText
      ? `Include the following text prominently in the image: "${imageText}".`
      : "Do NOT include any text, words, letters, or numbers in the image.";
    return `${prompt} ${fmt}. In the style of: ${artStyle}. ${textInstruction}`;
  }

  async function handleUseImage() {
    if (!selectedVersion) return;

    try {
      const res = await fetch("/api/posts/select-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          versionId: selectedVersion.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to select image");
        return;
      }

      setCurrentPostImagePath(selectedVersion.storage_path);
      onImageGenerated(selectedVersion.image_url);
      onOpenChange(false);
      toast.success("Image added to your post!");
    } catch {
      toast.error("Failed to select image");
    }
  }

  function scrollThumbnails(direction: "left" | "right") {
    if (!thumbnailsRef.current) return;
    const amount = 200;
    thumbnailsRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  const isCurrentlySelected = selectedVersion?.storage_path === currentPostImagePath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: "640px" }} className="max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Generate Post Image
          </DialogTitle>
          <DialogDescription>
            AI will create an image based on your post content. Uses your configured AI provider&apos;s API key.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* Provider selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image AI Provider</Label>
            {availableProviders.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <Info className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No image-capable provider configured</p>
                  <p className="mt-0.5">
                    Your current AI provider doesn&apos;t support image generation.
                    Go to Settings and configure OpenAI, Google, or Anthropic to enable this feature.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {availableProviders.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        provider === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {providerInfo[p]?.label ?? p}
                    </button>
                  ))}
                </div>

                {/* Always show the model row when at least one model is
                    available for the selected provider. Owner direction
                    2026-05-07: keep the model picker visible even with a
                    single option so users can see what model is being
                    used for this generation, and can switch when more
                    models are available. */}
                {currentModels.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      Model
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentModels.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setModel(m.value)}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                            model === m.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="size-3 shrink-0" />
                  Provider and model picks here only apply to this image. They don&apos;t change your active provider in Settings.
                </p>
              </>
            )}
          </div>

          {/* Image Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image Format</Label>
            <div className="flex gap-2">
              {IMAGE_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => setImageFormat(fmt.value)}
                  className={`flex-1 rounded-lg border p-2.5 text-center transition-colors ${
                    imageFormat === fmt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <div className="text-xs font-medium">{fmt.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{fmt.dimensions}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text in Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Text in Image</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIncludeText(false)}
                className={`flex-1 rounded-lg border p-2.5 text-center transition-colors ${
                  !includeText
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <div className="text-xs font-medium">No Text</div>
                <div className="text-[10px] opacity-70 mt-0.5">Image only</div>
              </button>
              <button
                type="button"
                onClick={() => setIncludeText(true)}
                className={`flex-1 rounded-lg border p-2.5 text-center transition-colors ${
                  includeText
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <div className="text-xs font-medium">Include Text</div>
                <div className="text-[10px] opacity-70 mt-0.5">Add custom text overlay</div>
              </button>
            </div>
            {includeText && (
              <div className="space-y-1.5">
                <Input
                  placeholder="Enter text to include in the image..."
                  value={imageText}
                  onChange={(e) => setImageText(e.target.value.slice(0, 150))}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {imageText.length}/150
                </p>
              </div>
            )}
          </div>

          {/* Art Style Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Art Style</Label>
            <Select value={artStyle} onValueChange={(v) => { if (v) setArtStyle(v); }}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ART_STYLES.map((style) => (
                  <SelectItem key={style} value={style} className="text-sm">
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt (collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <ChevronDown className={`size-3.5 transition-transform ${showPrompt ? "" : "-rotate-90"}`} />
              Image Prompt
            </button>
            {showPrompt && (
              <>
                <textarea
                  id="img-prompt"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Describe the image you want..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Art style is appended automatically. Image generation costs apply to your AI provider account.
                </p>
              </>
            )}
          </div>

          {/* Generating spinner + cancel */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
              >
                <X className="size-3" />
                Cancel
              </button>
            </div>
          )}

          {/* Main preview image */}
          {selectedVersion && !generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {versions.length > 1
                    ? `Image ${selectedIndex + 1} of ${versions.length}`
                    : "Generated Image"}
                </Label>
                {isCurrentlySelected && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                    <Check className="size-3" />
                    Currently used
                  </span>
                )}
              </div>
              <div className="rounded-lg border overflow-hidden">
                <img
                  src={selectedVersion.image_url}
                  alt="Generated post image"
                  className="w-full object-cover"
                  style={{ maxHeight: "300px" }}
                />
              </div>
              {selectedVersion.source === "ai" && selectedVersion.prompt && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {selectedVersion.prompt}
                </p>
              )}
            </div>
          )}

          {/* Thumbnail carousel */}
          {versions.length > 1 && !generating && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">All Versions</Label>
              <div className="relative">
                {/* Left arrow */}
                <button
                  type="button"
                  onClick={() => scrollThumbnails("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/90 border shadow-sm p-1 hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                </button>

                {/* Thumbnails */}
                <div
                  ref={thumbnailsRef}
                  className="flex gap-2 overflow-x-auto px-7 py-1 scrollbar-hide"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {versions.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className={`relative shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                        i === selectedIndex
                          ? "border-primary ring-1 ring-primary/30"
                          : v.storage_path === currentPostImagePath
                            ? "border-green-500/50"
                            : "border-transparent hover:border-foreground/20"
                      }`}
                      style={{ width: "72px", height: "54px" }}
                    >
                      <img
                        src={v.image_url}
                        alt={`Version ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Source badge */}
                      <span className="absolute bottom-0.5 right-0.5 rounded-full bg-background/80 p-0.5">
                        {v.source === "ai" ? (
                          <Sparkles className="size-2.5 text-primary" />
                        ) : (
                          <Upload className="size-2.5 text-muted-foreground" />
                        )}
                      </span>
                      {/* Active indicator */}
                      {v.storage_path === currentPostImagePath && (
                        <span className="absolute top-0.5 left-0.5 rounded-full bg-green-500 p-0.5">
                          <Check className="size-2 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Right arrow */}
                <button
                  type="button"
                  onClick={() => scrollThumbnails("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/90 border shadow-sm p-1 hover:bg-accent transition-colors"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full prompt viewer */}
        {showFullPrompt && (
          <div className="rounded-md border bg-muted/30 p-3 max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-sans text-muted-foreground">
              {getFullPrompt()}
            </pre>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              title="View full prompt"
              className="text-muted-foreground"
            >
              <Braces className="size-3.5" />
            </Button>
          </div>

          <div className="flex gap-2">
            {/* Show Regenerate when there are versions or currently generating */}
            {versions.length > 0 && !generating && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={!provider}
              >
                <RefreshCw className="size-3.5" />
                Generate Another
              </Button>
            )}

            {/* Use This Image — only when a version is selected and it's not already the post's image */}
            {selectedVersion && !generating && !isCurrentlySelected && (
              <Button className="gap-1.5" onClick={handleUseImage}>
                Use This Image
              </Button>
            )}

            {/* Initial generate button when no versions exist yet */}
            {versions.length === 0 && !generating && (
              <Button
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={!prompt.trim() || !provider}
              >
                <Sparkles className="size-3.5" />
                Generate Image
              </Button>
            )}

            {generating && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleCancelGeneration}
              >
                <X className="size-3.5" />
                Cancel Generation
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
