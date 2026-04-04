"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, Info, Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Anthropic does not support native image generation via API
};

// Providers that support image generation (Anthropic does not support native image gen)
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
  const defaultPrompt = `Generate an image for a social media post illustrating the concept of ${postTitle || "a LinkedIn post"}, inspired by the theme: ${hook}.`;

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("landscape");
  const [artStyle, setArtStyle] = useState(ART_STYLES[0]);
  const [includeText, setIncludeText] = useState(false);
  const [imageText, setImageText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // Provider state
  const [provider, setProvider] = useState<ImageProvider | null>(null);
  const [model, setModel] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<ImageProvider[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (open && !configLoaded) {
      loadConfig();
    }
    if (open) {
      setPrompt(defaultPrompt);
      setPreviewUrl(null);
    }
  }, [open]);

  async function loadConfig() {
    try {
      // Fetch all configured provider keys
      const res = await fetch("/api/settings/provider-keys");
      if (!res.ok) return;
      const { keys } = await res.json();

      // Also check legacy creator_profiles key as fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("ai_provider, ai_api_key_encrypted")
        .eq("user_id", user.id)
        .single();

      // Build list of image-capable providers that have keys
      const available: ImageProvider[] = [];

      // From new provider keys table
      for (const key of keys) {
        if (IMAGE_CAPABLE_PROVIDERS.includes(key.provider as ImageProvider)) {
          if (!available.includes(key.provider as ImageProvider)) {
            available.push(key.provider as ImageProvider);
          }
        }
      }

      // Fallback: legacy key on creator_profiles
      if (
        profile?.ai_api_key_encrypted &&
        IMAGE_CAPABLE_PROVIDERS.includes(profile.ai_provider as ImageProvider) &&
        !available.includes(profile.ai_provider as ImageProvider)
      ) {
        available.push(profile.ai_provider as ImageProvider);
      }

      setConfiguredProviders(available);

      // Auto-select: active provider first, then first available
      const activeKey = keys.find((k: { is_active: boolean }) => k.is_active);
      if (activeKey && available.includes(activeKey.provider as ImageProvider)) {
        setProvider(activeKey.provider as ImageProvider);
        setModel(IMAGE_PROVIDER_CONFIG[activeKey.provider as ImageProvider].models[0].value);
      } else if (available.length > 0) {
        setProvider(available[0]);
        setModel(IMAGE_PROVIDER_CONFIG[available[0]].models[0].value);
      } else {
        setProvider(null);
      }
    } catch {
      // Silently fail — show no providers
    }

    setConfigLoaded(true);
  }

  function handleProviderChange(p: ImageProvider) {
    setProvider(p);
    setModel(IMAGE_PROVIDER_CONFIG[p].models[0].value);
  }

  const currentModels = provider ? IMAGE_PROVIDER_CONFIG[provider]?.models ?? [] : [];

  const availableProviders = configuredProviders;

  async function handleGenerate() {
    if (!provider) {
      toast.error("No image-capable AI provider configured. Please update your settings.");
      return;
    }

    setGenerating(true);
    setPreviewUrl(null);

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
        toast.error(data.error || "Failed to generate image", {
          duration: 8000,
        });
        return;
      }

      setPreviewUrl(data.imageUrl);
    } catch {
      toast.error("Failed to generate image. Check your AI provider settings.");
    } finally {
      setGenerating(false);
    }
  }

  // Build full prompt as the API will see it
  function getFullPrompt() {
    const fmt = imageFormat === "square"
      ? "square format (1:1, 1080x1080)"
      : "landscape format (16:9, 1920x1080)";
    const textInstruction = includeText && imageText
      ? `Include the following text prominently in the image: "${imageText}".`
      : "Do NOT include any text, words, letters, or numbers in the image.";
    return `${prompt} ${fmt}. In the style of: ${artStyle}. ${textInstruction}`;
  }

  function handleUseImage() {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      onOpenChange(false);
      toast.success("Image added to your post!");
    }
  }

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
          {/* Provider selector — only shows configured providers */}
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

                {/* Model selector */}
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

                {/* Settings note */}
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
            <div className="flex flex-wrap gap-1.5">
              {ART_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setArtStyle(style)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    artStyle === style
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="img-prompt" className="text-sm font-medium">
              Image Prompt
            </Label>
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
          </div>

          {/* Preview */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
            </div>
          )}

          {previewUrl && !generating && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Generated Image</Label>
              <div className="rounded-lg border overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Generated post image"
                  className="w-full object-cover"
                  style={{ maxHeight: "300px" }}
                />
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
            {previewUrl && !generating && (
              <>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleGenerate}
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </Button>
                <Button className="gap-1.5" onClick={handleUseImage}>
                  Use This Image
                </Button>
              </>
            )}

            {!previewUrl && (
              <Button
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim() || !provider}
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {generating ? "Generating..." : "Generate Image"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
