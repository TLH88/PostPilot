"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROVIDER_CONFIG, type AIProvider } from "@/lib/ai/providers";

interface SystemAIConfig {
  default_provider: AIProvider;
  default_model: string;
  updated_at: string | null;
  updated_by: string | null;
}

const PROVIDERS: AIProvider[] = ["openai", "anthropic", "google", "perplexity"];
const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
  perplexity: "Perplexity",
};

export function SystemAIConfigCard() {
  const [config, setConfig] = useState<SystemAIConfig | null>(null);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [model, setModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current config once
  useEffect(() => {
    fetch("/api/admin/system-ai-config")
      .then((r) => r.json())
      .then((data: SystemAIConfig) => {
        setConfig(data);
        setProvider(data.default_provider);
        setModel(data.default_model);
      })
      .catch(() => toast.error("Failed to load system AI config"))
      .finally(() => setLoading(false));
  }, []);

  // Available models for the currently-selected provider
  const availableModels = useMemo(
    () => PROVIDER_CONFIG[provider]?.availableModels ?? [],
    [provider]
  );

  // When the admin switches provider, reset the model to that provider's
  // default so we never persist a mismatched pair.
  function handleProviderChange(next: AIProvider) {
    setProvider(next);
    const providerDefault = PROVIDER_CONFIG[next]?.defaultModel;
    if (providerDefault) setModel(providerDefault);
  }

  const isDirty =
    !!config && (config.default_provider !== provider || config.default_model !== model);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/system-ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        return;
      }
      setConfig({
        default_provider: data.default_provider,
        default_model: data.default_model,
        updated_at: new Date().toISOString(),
        updated_by: null,
      });
      toast.success("System AI default updated. All new requests will use this.");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="size-4 text-primary" />
          Default System AI (Free, Personal, Pro without BYOK)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          All AI calls from users on system keys route through this provider + model.
          BYOK users (Pro / Team with their own key configured) are unaffected.
          Changes take effect immediately on the next request.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Provider</span>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Model</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {availableModels.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-muted-foreground">
                Current:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {config?.default_provider}/{config?.default_model}
                </code>
                {config?.updated_at && (
                  <span className="ml-2">
                    · updated{" "}
                    {new Date(config.updated_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <Badge variant="secondary" className="text-[10px]">
                    Unsaved
                  </Badge>
                )}
                <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
                  {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Save default
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
