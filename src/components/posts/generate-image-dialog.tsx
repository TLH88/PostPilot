"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, RefreshCw, Info, Braces, ChevronLeft, ChevronRight, ChevronDown, Upload, Check } from "lucide-react";
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
import type { PostImageVersion } from "@/types";

interface GenerateImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string | null;
  postContent: string;
  onImageGenerated: (imageUrl: string) => void;
}

type ImageProvider = "openai" | "google";

const IMAGE_PROVIDER_CONFIG: Record<
  ImageProvider,
  { label: string; models: { value: string; label: string }[] }
> = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-image-1.5", label: "GPT Image 1.5" },
      { value: "gpt-image-1", label: "GPT Image 1" },
      { value: "gpt-image-1-mini", label: "GPT Image 1 Mini" },
      { value: "dall-e-3", label: "DALL-E 3" },
      { value: "dall-e-2", label: "DALL-E 2" },
    ],
  },
  google: {
    label: "Google (Gemini)",
    models: [
      { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image" },
      { value: "gemini-2.0-flash-preview-image-generation", label: "Gemini 2.0 Flash Image" },
    ],
  },
};

const IMAGE_CAPABLE_PROVIDERS: ImageProvider[] = ["openai", "google"];

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

  // Provider state
  const [provider, setProvider] = useState<ImageProvider | null>(null);
  const [model, setModel] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<ImageProvider[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

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
      const [imageRes, textRes] = await Promise.all([
        fetch("/api/settings/provider-keys?keyType=image"),
        fetch("/api/settings/provider-keys?keyType=text"),
      ]);

      const imageKeys: Array<{ provider: string; is_active: boolean }> =
        imageRes.ok ? (await imageRes.json()).keys ?? [] : [];
      const textKeys: Array<{ provider: string; is_active: boolean }> =
        textRes.ok ? (await textRes.json()).keys ?? [] : [];

      const available: ImageProvider[] = [];

      // Image-specific keys take priority
      for (const key of imageKeys) {
        if (
          IMAGE_CAPABLE_PROVIDERS.includes(key.provider as ImageProvider) &&
          !available.includes(key.provider as ImageProvider)
        ) {
          available.push(key.provider as ImageProvider);
        }
      }

      // Fall back to any text keys that happen to be for image-capable
      // providers (OpenAI / Google) — users can use their text key for
      // image gen too if no dedicated image key is configured
      for (const key of textKeys) {
        if (
          IMAGE_CAPABLE_PROVIDERS.includes(key.provider as ImageProvider) &&
          !available.includes(key.provider as ImageProvider)
        ) {
          available.push(key.provider as ImageProvider);
        }
      }

      setConfiguredProviders(available);

      // Prefer the active image key, then active text key, then first available
      const activeImageKey = imageKeys.find((k) => k.is_active);
      const activeTextKey = textKeys.find(
        (k) =>
          k.is_active &&
          IMAGE_CAPABLE_PROVIDERS.includes(k.provider as ImageProvider)
      );

      const pick =
        (activeImageKey?.provider as ImageProvider | undefined) ||
        (activeTextKey?.provider as ImageProvider | undefined) ||
        available[0];

      if (pick && available.includes(pick)) {
        setProvider(pick);
        setModel(IMAGE_PROVIDER_CONFIG[pick].models[0].value);
      } else {
        setProvider(null);
      }
    } catch {
      // Silently fail
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

  function handleProviderChange(p: ImageProvider) {
    setProvider(p);
    setModel(IMAGE_PROVIDER_CONFIG[p].models[0].value);
  }

  const currentModels = provider ? IMAGE_PROVIDER_CONFIG[provider]?.models ?? [] : [];
  const availableProviders = configuredProviders;
  const selectedVersion = versions[selectedIndex] ?? null;

  async function handleGenerate() {
    if (!provider) {
      toast.error("No image-capable AI provider configured. Please update your settings.");
      return;
    }

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
      });

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
    } catch {
      toast.error("Failed to generate image. Check your AI provider settings.");
    } finally {
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
                      {IMAGE_PROVIDER_CONFIG[p].label}
                    </button>
                  ))}
                </div>

                {currentModels.length > 1 && (
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
                )}

                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="size-3 shrink-0" />
                  To use a different provider for image generation, configure it in Settings. Your existing API key will be used.
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

          {/* Generating spinner */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
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
              <Button disabled className="gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Generating...
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
