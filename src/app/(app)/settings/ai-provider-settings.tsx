"use client";

/**
 * BYOK settings (2026-05-07 redesign).
 *
 * Single dashboard listing every configured AI provider — text and image
 * mixed in one list with capability badges and Active markers per kind.
 * One inline "Add provider key" form. Per-row inline model dropdown that
 * appears only after the key has been validated.
 *
 * The provider list, capability metadata, key placeholders, and help URLs
 * all come from the `ai_providers` registry (via /api/providers). Adding
 * a 5th provider is one DB row + one adapter file — no edits here.
 *
 * Models come from the `ai_models` table via /api/models?kind=… and are
 * refreshed by the adapter pipeline whenever a key is tested or saved
 * (see /api/settings/test-ai-key, /api/settings/provider-keys POST).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  Key,
  FlaskConical,
  Check,
  AlertCircle,
  HelpCircle,
  Trash2,
  Plus,
  Lock,
  Sparkles,
  Image as ImageIcon,
  Type as TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";

interface ProviderRegistryRow {
  slug: string;
  label: string;
  placeholder: string;
  capabilities: ("text" | "image")[];
  help_url: string | null;
  sort_order: number;
}

interface ConfiguredKey {
  id: string;
  provider: string;
  key_type: "text" | "image";
  is_active: boolean;
  tested_at: string | null;
  model_id: string | null;
}

interface ModelEntry {
  value: string;
  label: string;
}
interface ModelsByProvider {
  [provider: string]: { models: ModelEntry[]; defaultModel: string };
}

interface AIProviderSettingsProps {
  currentForceGateway: boolean;
  subscriptionTier: SubscriptionTier;
}

type Capability = "text" | "image";

export function AIProviderSettings({
  currentForceGateway,
  subscriptionTier,
}: AIProviderSettingsProps) {
  const byokUnlocked = hasFeature(subscriptionTier, "byok_ai_keys");

  // Loading
  const [loading, setLoading] = useState(true);

  // Registry (from /api/providers)
  const [providers, setProviders] = useState<ProviderRegistryRow[]>([]);

  // User's configured keys (text + image combined)
  const [keys, setKeys] = useState<ConfiguredKey[]>([]);

  // Model catalogs per kind (from /api/models?kind=…)
  const [textModels, setTextModels] = useState<ModelsByProvider>({});
  const [imageModels, setImageModels] = useState<ModelsByProvider>({});

  // Force-gateway toggle
  const [forceGateway, setForceGateway] = useState(currentForceGateway);
  const [savingGateway, setSavingGateway] = useState(false);

  // Add-key form
  const [addOpen, setAddOpen] = useState(false);
  const [addProvider, setAddProvider] = useState<string>("");
  const [addCaps, setAddCaps] = useState<Capability[]>(["text"]);
  const [addKey, setAddKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [addResult, setAddResult] = useState<"success" | "error" | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, textKeysRes, imageKeysRes, textModelsRes, imageModelsRes] =
        await Promise.all([
          fetch("/api/providers"),
          fetch("/api/settings/provider-keys?keyType=text"),
          fetch("/api/settings/provider-keys?keyType=image"),
          fetch("/api/models?kind=text"),
          fetch("/api/models?kind=image"),
        ]);
      if (provRes.ok) {
        const json = await provRes.json();
        setProviders(json.providers ?? []);
      }
      const merged: ConfiguredKey[] = [];
      if (textKeysRes.ok) {
        const json = await textKeysRes.json();
        for (const k of json.keys ?? []) merged.push(k);
      }
      if (imageKeysRes.ok) {
        const json = await imageKeysRes.json();
        for (const k of json.keys ?? []) merged.push(k);
      }
      setKeys(merged);
      if (textModelsRes.ok) setTextModels(await textModelsRes.json());
      if (imageModelsRes.ok) setImageModels(await imageModelsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Force Gateway ──────────────────────────────────────────────────────────
  async function toggleGateway(next: boolean) {
    setForceGateway(next);
    setSavingGateway(true);
    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAiGateway: next }),
      });
      if (!res.ok) throw new Error("Failed to update gateway");
      toast.success(
        next
          ? "PostPilot AI Gateway enabled."
          : "AI Gateway disabled — using your configured provider keys."
      );
    } catch {
      setForceGateway(!next);
      toast.error("Failed to update gateway preference.");
    } finally {
      setSavingGateway(false);
    }
  }

  // ── Add-key form ───────────────────────────────────────────────────────────
  const selectedProvider = useMemo(
    () => providers.find((p) => p.slug === addProvider) ?? null,
    [providers, addProvider]
  );

  // When the user picks a provider that doesn't support image, drop image
  // from the capability checkboxes.
  useEffect(() => {
    if (!selectedProvider) return;
    setAddCaps((prev) =>
      prev.filter((c) => selectedProvider.capabilities.includes(c))
    );
    if (selectedProvider.capabilities.length === 1) {
      setAddCaps([selectedProvider.capabilities[0]]);
    }
  }, [selectedProvider]);

  function toggleAddCap(cap: Capability) {
    setAddCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function resetAddForm() {
    setAddProvider("");
    setAddCaps(["text"]);
    setAddKey("");
    setAddResult(null);
  }

  async function testAddKey() {
    if (!addProvider || !addKey.trim() || addCaps.length === 0) return;
    setTesting(true);
    setAddResult(null);
    try {
      const res = await fetch("/api/settings/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: addProvider,
          apiKey: addKey,
          keyType: addCaps[0], // adapter validation is the same regardless
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddResult("error");
        toast.error(data.error ?? "Key test failed.");
      } else {
        setAddResult("success");
        toast.success("Key is valid.");
      }
    } catch {
      setAddResult("error");
      toast.error("Key test failed.");
    } finally {
      setTesting(false);
    }
  }

  async function saveAddKey() {
    if (!addProvider || !addKey.trim() || addCaps.length === 0) return;
    setAdding(true);
    try {
      const res = await fetch("/api/settings/provider-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: addProvider,
          apiKey: addKey,
          keyTypes: addCaps,
          // Auto-activate on first key for that kind; harmless if already
          // active for another provider — the route deactivates others.
          setActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save key.");
      } else {
        toast.success(`Saved ${addProvider}.`);
        resetAddForm();
        setAddOpen(false);
        await loadAll();
      }
    } catch {
      toast.error("Failed to save key.");
    } finally {
      setAdding(false);
    }
  }

  // ── Row actions ────────────────────────────────────────────────────────────
  async function setActive(key: ConfiguredKey) {
    try {
      const res = await fetch("/api/settings/provider-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: key.provider, keyType: key.key_type }),
      });
      if (!res.ok) throw new Error("Switch failed");
      toast.success(`${key.provider} is now active for ${key.key_type}.`);
      await loadAll();
    } catch {
      toast.error("Failed to switch active provider.");
    }
  }

  async function setModel(key: ConfiguredKey, modelId: string) {
    try {
      const res = await fetch("/api/settings/provider-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: key.provider,
          keyType: key.key_type,
          modelId,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadAll();
    } catch {
      toast.error("Failed to update model.");
    }
  }

  async function testRow(key: ConfiguredKey) {
    try {
      const res = await fetch("/api/settings/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: key.provider, keyType: key.key_type }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Key test failed.");
      } else {
        toast.success(`${key.provider} key tested OK.`);
        await loadAll();
      }
    } catch {
      toast.error("Key test failed.");
    }
  }

  async function deleteRow(key: ConfiguredKey) {
    if (!confirm(`Remove ${key.provider} (${key.key_type})?`)) return;
    try {
      const res = await fetch("/api/settings/provider-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: key.provider, keyType: key.key_type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove key.");
      } else {
        toast.success("Key removed.");
        await loadAll();
      }
    } catch {
      toast.error("Failed to remove key.");
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function providerLabel(slug: string): string {
    return providers.find((p) => p.slug === slug)?.label ?? slug;
  }

  function modelsFor(provider: string, kind: Capability): ModelEntry[] {
    const map = kind === "image" ? imageModels : textModels;
    return map[provider]?.models ?? [];
  }

  function defaultModelFor(provider: string, kind: Capability): string {
    const map = kind === "image" ? imageModels : textModels;
    return map[provider]?.defaultModel ?? "";
  }

  // ── BYOK tier gate ─────────────────────────────────────────────────────────
  if (!byokUnlocked) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Lock className="size-4" />
          BYOK is a Professional+ feature
        </div>
        <p>
          You&apos;re on the {subscriptionTier} plan. PostPilot&apos;s built-in AI
          covers all your needs at this tier. Upgrade to Professional or above
          to bring your own OpenAI / Anthropic / Google / Perplexity keys.
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Force Gateway toggle */}
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="size-3.5" />
            Use PostPilot&apos;s built-in AI
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, PostPilot routes your AI requests through its managed
            gateway and bills against your plan. When off, your configured
            provider keys below are used.
          </p>
        </div>
        <Switch
          checked={forceGateway}
          onCheckedChange={toggleGateway}
          disabled={savingGateway}
        />
      </div>

      {/* Configured providers dashboard */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your AI Providers</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setAddOpen((v) => !v)}
          >
            <Plus className="size-3.5" />
            Add Provider Key
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Loading providers…
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No keys configured yet. Use{" "}
            <span className="font-medium text-foreground">Add Provider Key</span>{" "}
            to bring your own OpenAI, Anthropic, Google, or Perplexity key.
          </div>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => {
              const models = modelsFor(k.provider, k.key_type);
              const selectedModel = k.model_id ?? defaultModelFor(k.provider, k.key_type);
              return (
                <li
                  key={`${k.provider}-${k.key_type}`}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{providerLabel(k.provider)}</span>
                    <CapabilityBadge kind={k.key_type} />
                    {k.is_active && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Active ({k.key_type})
                      </span>
                    )}
                    {k.tested_at && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        Tested {formatRelative(k.tested_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {models.length > 0 && (
                      <Select
                        value={selectedModel}
                        onValueChange={(v) => {
                          if (v) setModel(k, v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-auto min-w-[200px] text-xs">
                          <SelectValue placeholder="Default model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m.value} value={m.value} className="text-xs">
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {!k.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={() => setActive(k)}
                        >
                          Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => testRow(k)}
                      >
                        <FlaskConical className="size-3.5 mr-1" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteRow(k)}
                        disabled={k.is_active}
                        title={
                          k.is_active
                            ? "Set another provider active before removing this one."
                            : "Remove key"
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add-key form */}
      {addOpen && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-provider" className="text-xs">
                Provider
              </Label>
              <Select
                value={addProvider}
                onValueChange={(v) => setAddProvider(v ?? "")}
              >
                <SelectTrigger id="add-provider" className="text-sm">
                  <SelectValue placeholder="Pick a provider…" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProvider && selectedProvider.capabilities.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs">Use for</Label>
                <div className="flex gap-2">
                  {(["text", "image"] as Capability[]).map((cap) =>
                    selectedProvider.capabilities.includes(cap) ? (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => toggleAddCap(cap)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          addCaps.includes(cap)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        )}
                      >
                        {cap === "text" ? (
                          <TypeIcon className="size-3.5" />
                        ) : (
                          <ImageIcon className="size-3.5" />
                        )}
                        {cap === "text" ? "Text generation" : "Image generation"}
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="add-key" className="text-xs">
                API Key
              </Label>
              <Input
                id="add-key"
                type="password"
                placeholder={selectedProvider?.placeholder ?? "Enter API key…"}
                value={addKey}
                onChange={(e) => {
                  setAddKey(e.target.value);
                  setAddResult(null);
                }}
                autoComplete="off"
                spellCheck={false}
              />
              {selectedProvider?.help_url && (
                <a
                  href={selectedProvider.help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <HelpCircle className="size-3" />
                  Where do I find my {selectedProvider.label} key?
                </a>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={testAddKey}
                disabled={
                  testing || !addProvider || !addKey.trim() || addCaps.length === 0
                }
              >
                {testing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FlaskConical className="size-3.5" />
                )}
                Test Key
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={saveAddKey}
                disabled={
                  adding || !addProvider || !addKey.trim() || addCaps.length === 0
                }
              >
                {adding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Key className="size-3.5" />
                )}
                Save & Activate
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetAddForm();
                  setAddOpen(false);
                }}
              >
                Cancel
              </Button>

              {addResult === "success" && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="size-3.5" />
                  Validated
                </span>
              )}
              {addResult === "error" && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3.5" />
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers / sub-components ───────────────────────────────────────────

function CapabilityBadge({ kind }: { kind: "text" | "image" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        kind === "text"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
      )}
    >
      {kind === "text" ? (
        <TypeIcon className="size-2.5" />
      ) : (
        <ImageIcon className="size-2.5" />
      )}
      {kind === "text" ? "Text" : "Image"}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(1, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
