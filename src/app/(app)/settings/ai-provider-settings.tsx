"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Key,
  FlaskConical,
  Check,
  AlertCircle,
  HelpCircle,
  Trash2,
  Zap,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type AIProvider } from "@/lib/ai/providers";
import { useModels } from "@/lib/ai/use-models";
import { APIKeyHelpDrawer } from "@/components/ai-help/api-key-help-drawer";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";

// All 4 text providers, shown in a fixed order so users see all options
const TEXT_AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "openai", label: "OpenAI (GPT / o-series)", placeholder: "sk-..." },
  { value: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { value: "perplexity", label: "Perplexity (Sonar)", placeholder: "pplx-..." },
] as const;

// Only OpenAI and Google support image generation
const IMAGE_AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (DALL-E / gpt-image)", placeholder: "sk-..." },
  { value: "google", label: "Google (Gemini)", placeholder: "AIza..." },
] as const;

const IMAGE_MODELS: Record<"openai" | "google", { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-image-1", label: "GPT Image 1 (recommended)" },
    { value: "dall-e-3", label: "DALL-E 3" },
    { value: "dall-e-2", label: "DALL-E 2" },
  ],
  google: [
    { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image (Preview)" },
  ],
};

type ConfiguredKey = {
  id: string;
  provider: string;
  key_type: "text" | "image";
  is_active: boolean;
  tested_at: string | null;
};

interface AIProviderSettingsProps {
  currentProvider: string;
  currentModel: string | null;
  hasExistingKey: boolean;
  currentForceGateway: boolean;
  subscriptionTier: SubscriptionTier;
}

export function AIProviderSettings({
  currentProvider,
  currentModel,
  hasExistingKey,
  currentForceGateway,
  subscriptionTier,
}: AIProviderSettingsProps) {
  const byokUnlocked = hasFeature(subscriptionTier, "byok_ai_keys");

  // Gateway toggle — always visible, locked ON for non-BYOK tiers
  const [forceGateway, setForceGateway] = useState(currentForceGateway);
  const [savingGateway, setSavingGateway] = useState(false);

  // Text AI form state
  const [provider, setProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState<string | null>(currentModel);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [savedProvider, setSavedProvider] = useState(currentProvider);
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const [savedModel, setSavedModel] = useState<string | null>(currentModel);
  const [keyConfigured, setKeyConfigured] = useState(hasExistingKey);

  // Configured keys (text + image)
  const [textKeys, setTextKeys] = useState<ConfiguredKey[]>([]);
  const [imageKeys, setImageKeys] = useState<ConfiguredKey[]>([]);

  // Collapsible section state
  const [textListOpen, setTextListOpen] = useState(false);
  const [textFormOpen, setTextFormOpen] = useState(false);
  const [imageFormOpen, setImageFormOpen] = useState(false);

  // Image AI form state
  const [imgProvider, setImgProvider] = useState<"openai" | "google">("openai");
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS.openai[0].value);
  const [imgApiKey, setImgApiKey] = useState("");
  const [imgSaving, setImgSaving] = useState(false);
  const [imgTesting, setImgTesting] = useState(false);
  const [imgTestResult, setImgTestResult] = useState<"success" | "error" | null>(null);

  const loadConfiguredKeys = useCallback(async () => {
    try {
      const [textRes, imageRes] = await Promise.all([
        fetch("/api/settings/provider-keys?keyType=text"),
        fetch("/api/settings/provider-keys?keyType=image"),
      ]);
      if (textRes.ok) {
        const { keys } = await textRes.json();
        setTextKeys(keys);
      }
      if (imageRes.ok) {
        const { keys } = await imageRes.json();
        setImageKeys(keys);
      }
    } catch {
      // Silent fail — RLS & auth errors already handled by API
    }
  }, []);

  useEffect(() => {
    loadConfiguredKeys();
  }, [loadConfiguredKeys]);

  const { getAvailableModels, getDefaultModel } = useModels();

  const selectedProviderInfo = TEXT_AI_PROVIDERS.find((p) => p.value === provider);
  const availableModels = getAvailableModels(provider as AIProvider);
  const effectiveModel = selectedModel ?? getDefaultModel(provider as AIProvider);

  // ── Gateway toggle handler ────────────────────────────────────────────────
  async function handleToggleForceGateway(next: boolean) {
    setForceGateway(next);
    setSavingGateway(true);
    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAiGateway: next }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      toast.success(
        next
          ? "AI Gateway enabled — using PostPilot's managed AI access."
          : "AI Gateway disabled — using your configured provider keys."
      );
    } catch {
      setForceGateway(!next);
      toast.error("Failed to update gateway setting.");
    } finally {
      setSavingGateway(false);
    }
  }

  // ── Text AI key save ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!apiKey && !keyConfigured) {
      toast.error("Please enter an API key.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey || undefined,
          aiModel: selectedModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      if (apiKey) {
        await fetch("/api/settings/provider-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            keyType: "text",
            setActive: true,
          }),
        });
      } else {
        await fetch("/api/settings/provider-keys", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, keyType: "text" }),
        });
      }

      toast.success("Text AI provider saved.");
      setSavedProvider(provider);
      setSavedModel(selectedModel);
      if (apiKey) setKeyConfigured(true);
      setApiKey("");
      setTestResult(null);
      loadConfiguredKeys();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save settings.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestKey() {
    if (!apiKey && !keyConfigured) {
      toast.error("Please enter an API key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey || undefined,
          aiModel: selectedModel,
          keyType: "text",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTestResult("error");
        toast.error(data.error || "API key test failed.");
        return;
      }

      setTestResult("success");
      toast.success(data.message || "API key is valid!");
      loadConfiguredKeys();
    } catch {
      setTestResult("error");
      toast.error("Failed to test API key.");
    } finally {
      setTesting(false);
    }
  }

  // ── Image AI key save ──────────────────────────────────────────────────────
  async function handleImgSave(e: React.FormEvent) {
    e.preventDefault();
    if (!imgApiKey) {
      toast.error("Please enter an API key.");
      return;
    }
    setImgSaving(true);
    try {
      const res = await fetch("/api/settings/provider-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: imgProvider,
          apiKey: imgApiKey,
          keyType: "image",
          setActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save image provider key");
      }
      toast.success("Image AI provider saved.");
      setImgApiKey("");
      setImgTestResult(null);
      loadConfiguredKeys();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save.";
      toast.error(msg);
    } finally {
      setImgSaving(false);
    }
  }

  async function handleImgTestKey() {
    if (!imgApiKey) {
      toast.error("Please enter an API key first.");
      return;
    }
    setImgTesting(true);
    setImgTestResult(null);
    try {
      const res = await fetch("/api/settings/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: imgProvider,
          apiKey: imgApiKey,
          keyType: "image",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImgTestResult("error");
        toast.error(data.error || "API key test failed.");
        return;
      }
      setImgTestResult("success");
      toast.success("Image API key is valid.");
      loadConfiguredKeys();
    } catch {
      setImgTestResult("error");
      toast.error("Failed to test image API key.");
    } finally {
      setImgTesting(false);
    }
  }

  const activeProviderLabel = TEXT_AI_PROVIDERS.find(
    (p) => p.value === savedProvider
  )?.label;

  const activeModelLabel = getAvailableModels(savedProvider as AIProvider).find(
    (m) => m.value === (savedModel ?? getDefaultModel(savedProvider as AIProvider))
  )?.label;

  // ── Section render helpers ────────────────────────────────────────────────
  function renderTextProviderRow(p: typeof TEXT_AI_PROVIDERS[number]) {
    const stored = textKeys.find((k) => k.provider === p.value);
    const isTested = !!stored?.tested_at;
    const isActive = !!stored?.is_active;

    return (
      <div
        key={p.value}
        className="flex items-center justify-between rounded-md border px-3 py-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "size-2 rounded-full shrink-0",
              isActive ? "bg-green-500" : stored ? "bg-gray-300" : "bg-gray-200"
            )}
          />
          <span className="text-sm font-medium truncate">{p.label}</span>
          {isTested && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">
              Configured
            </span>
          )}
          {isActive && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!stored && byokUnlocked && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setProvider(p.value);
                setSelectedModel(null);
                setApiKey("");
                setTestResult(null);
                setTextFormOpen(true);
              }}
            >
              Setup Provider
            </Button>
          )}
          {stored && !isActive && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!byokUnlocked}
                onClick={async () => {
                  await fetch("/api/settings/provider-keys", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      provider: p.value,
                      keyType: "text",
                    }),
                  });
                  setSavedProvider(p.value);
                  setProvider(p.value);
                  setSelectedModel(null);
                  setKeyConfigured(true);
                  loadConfiguredKeys();
                  toast.success(`Switched to ${p.label}`);
                }}
              >
                Switch to
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-destructive hover:text-destructive"
                disabled={!byokUnlocked}
                onClick={async () => {
                  const res = await fetch("/api/settings/provider-keys", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      provider: p.value,
                      keyType: "text",
                    }),
                  });
                  if (res.ok) {
                    loadConfiguredKeys();
                    toast.success(`${p.label} removed`);
                  } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to remove");
                  }
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderImageProviderRow(p: typeof IMAGE_AI_PROVIDERS[number]) {
    const stored = imageKeys.find((k) => k.provider === p.value);
    const isTested = !!stored?.tested_at;
    const isActive = !!stored?.is_active;

    return (
      <div
        key={p.value}
        className="flex items-center justify-between rounded-md border px-3 py-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "size-2 rounded-full shrink-0",
              isActive ? "bg-green-500" : stored ? "bg-gray-300" : "bg-gray-200"
            )}
          />
          <span className="text-sm font-medium truncate">{p.label}</span>
          {isTested && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">
              Configured
            </span>
          )}
          {isActive && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        {stored && !isActive && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                const res = await fetch("/api/settings/provider-keys", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    provider: p.value,
                    keyType: "image",
                  }),
                });
                if (res.ok) {
                  loadConfiguredKeys();
                  toast.success(`${p.label} removed`);
                } else {
                  const data = await res.json();
                  toast.error(data.error || "Failed to remove");
                }
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Section 1: Gateway Toggle (always at top) ────────────────────── */}
      <div className="rounded-md border bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Zap className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-semibold">
                Use PostPilot&apos;s built-in AI
              </div>
              <p className="text-xs text-muted-foreground">
                Let PostPilot handle AI for you — billing is included with your
                plan and we automatically fall back if one provider is slow or
                down. Turn this off only if you want to use your own OpenAI or
                Anthropic account (added below).
              </p>
              {!byokUnlocked && (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-1">
                  <Lock className="size-3" /> Required on the{" "}
                  {subscriptionTier === "free" ? "Free" : "Personal"} plan.
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={forceGateway}
            onCheckedChange={handleToggleForceGateway}
            disabled={savingGateway || !byokUnlocked}
            aria-label="Use PostPilot AI Gateway"
          />
        </div>
      </div>

      {/* Everything below the gateway toggle is BYOK config — gated */}
      <div className="relative">
        {!byokUnlocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-2 p-6 max-w-sm">
              <Lock className="size-6 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                Want to use your own AI account?
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to Professional or Enterprise to add your own OpenAI or
                Anthropic API key. You&apos;ll be billed by that provider
                directly instead of us.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 mt-2 pointer-events-auto"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        )}

        <fieldset
          disabled={!byokUnlocked}
          className={cn(
            "space-y-4",
            !byokUnlocked && "pointer-events-none select-none"
          )}
        >
          {/* ── Section 2: Configured Text AI Providers (collapsible) ─── */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTextListOpen((v) => !v)}
              aria-expanded={textListOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Key className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Text AI Providers</span>
                {textKeys.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {textKeys.length} configured
                  </span>
                )}
              </div>
              {textListOpen ? (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {textListOpen && (
              <div className="space-y-1.5 rounded-md border p-3 bg-muted/30">
                {TEXT_AI_PROVIDERS.map(renderTextProviderRow)}
              </div>
            )}
          </div>

          {/* ── Section 3: Text AI Config (collapsible) ──────────────────── */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTextFormOpen((v) => !v)}
              aria-expanded={textFormOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FlaskConical className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">
                  Configure Text AI Provider Key
                </span>
              </div>
              {textFormOpen ? (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {textFormOpen && (
              <form
                onSubmit={handleSave}
                className="space-y-3 rounded-md border p-3 bg-muted/30"
              >
                {/* Active provider status */}
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      keyConfigured ? "bg-green-500" : "bg-amber-500"
                    )}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{activeProviderLabel}</span>
                    {activeModelLabel && (
                      <span className="text-muted-foreground">
                        {" "}
                        / {activeModelLabel}
                      </span>
                    )}
                    {" — "}
                    {keyConfigured ? (
                      <span className="text-green-600 dark:text-green-400">
                        Key configured
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        No key saved
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(v) => {
                      if (v) {
                        setProvider(v);
                        setSelectedModel(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_AI_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={effectiveModel}
                    onValueChange={(v) => {
                      if (v) setSelectedModel(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={
                      keyConfigured
                        ? "Enter new key to replace existing"
                        : selectedProviderInfo?.placeholder ?? "Enter your API key"
                    }
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    autoComplete="off"
                  />
                  {keyConfigured && !apiKey && (
                    <p className="text-xs text-muted-foreground">
                      A key is already saved. Leave blank to keep it.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setHelpDrawerOpen(true)}
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      <HelpCircle className="size-3" />
                      Need help finding your API key?
                    </button>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="gap-1.5">
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Key className="size-4" />
                    )}
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={testing || (!apiKey && !keyConfigured)}
                    onClick={handleTestKey}
                    className="gap-1.5"
                  >
                    {testing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : testResult === "success" ? (
                      <Check className="size-4 text-green-600" />
                    ) : testResult === "error" ? (
                      <AlertCircle className="size-4 text-red-600" />
                    ) : (
                      <FlaskConical className="size-4" />
                    )}
                    {testing ? "Testing..." : "Test Key"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* ── Section 4: Image Generation (collapsible) ────────────────── */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setImageFormOpen((v) => !v)}
              aria-expanded={imageFormOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Key className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">
                  Image Generation Providers
                </span>
                {imageKeys.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {imageKeys.length} configured
                  </span>
                )}
              </div>
              {imageFormOpen ? (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {imageFormOpen && (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                {/* Configured image providers list */}
                <div className="space-y-1.5">
                  {IMAGE_AI_PROVIDERS.map(renderImageProviderRow)}
                </div>

                <form onSubmit={handleImgSave} className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Image Provider</Label>
                    <Select
                      value={imgProvider}
                      onValueChange={(v) => {
                        if (v === "openai" || v === "google") {
                          setImgProvider(v);
                          setImgModel(IMAGE_MODELS[v][0].value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_AI_PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Image Model</Label>
                    <Select
                      value={imgModel}
                      onValueChange={(v) => {
                        if (v) setImgModel(v);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_MODELS[imgProvider].map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imgApiKey">Image API Key</Label>
                    <Input
                      id="imgApiKey"
                      type="password"
                      placeholder={
                        IMAGE_AI_PROVIDERS.find((p) => p.value === imgProvider)
                          ?.placeholder ?? ""
                      }
                      value={imgApiKey}
                      onChange={(e) => {
                        setImgApiKey(e.target.value);
                        setImgTestResult(null);
                      }}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Image keys are stored separately from your text AI key so
                      you can use different accounts or billing for image
                      generation.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={imgSaving} className="gap-1.5">
                      {imgSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Key className="size-4" />
                      )}
                      {imgSaving ? "Saving..." : "Save Image Key"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={imgTesting || !imgApiKey}
                      onClick={handleImgTestKey}
                      className="gap-1.5"
                    >
                      {imgTesting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : imgTestResult === "success" ? (
                        <Check className="size-4 text-green-600" />
                      ) : imgTestResult === "error" ? (
                        <AlertCircle className="size-4 text-red-600" />
                      ) : (
                        <FlaskConical className="size-4" />
                      )}
                      {imgTesting ? "Testing..." : "Test Key"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </fieldset>
      </div>

      <APIKeyHelpDrawer open={helpDrawerOpen} onOpenChange={setHelpDrawerOpen} />
    </div>
  );
}
