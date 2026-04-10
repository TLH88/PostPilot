"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Key, FlaskConical, Check, AlertCircle, HelpCircle, Trash2, Zap } from "lucide-react";
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
import { type AIProvider } from "@/lib/ai/providers";
import { useModels } from "@/lib/ai/use-models";
import { APIKeyHelpDrawer } from "@/components/ai-help/api-key-help-drawer";

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "openai", label: "OpenAI (GPT / o-series)", placeholder: "sk-..." },
  { value: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { value: "perplexity", label: "Perplexity (Sonar)", placeholder: "pplx-..." },
] as const;

interface AIProviderSettingsProps {
  currentProvider: string;
  currentModel: string | null;
  hasExistingKey: boolean;
  currentForceGateway: boolean;
}

export function AIProviderSettings({
  currentProvider,
  currentModel,
  hasExistingKey,
  currentForceGateway,
}: AIProviderSettingsProps) {
  const [provider, setProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState<string | null>(currentModel);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null
  );
  const [savedProvider, setSavedProvider] = useState(currentProvider);
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const [savedModel, setSavedModel] = useState<string | null>(currentModel);
  const [keyConfigured, setKeyConfigured] = useState(hasExistingKey);
  const [forceGateway, setForceGateway] = useState(currentForceGateway);
  const [savingGateway, setSavingGateway] = useState(false);

  // Configured provider keys
  const [configuredKeys, setConfiguredKeys] = useState<
    { id: string; provider: string; is_active: boolean }[]
  >([]);

  const loadConfiguredKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/provider-keys");
      if (res.ok) {
        const { keys } = await res.json();
        setConfiguredKeys(keys);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadConfiguredKeys();
  }, [loadConfiguredKeys]);

  const { getAvailableModels, getDefaultModel } = useModels();

  const selectedProviderInfo = AI_PROVIDERS.find((p) => p.value === provider);
  const availableModels = getAvailableModels(provider as AIProvider);
  const effectiveModel = selectedModel ?? getDefaultModel(provider as AIProvider);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!apiKey && !keyConfigured) {
      toast.error("Please enter an API key.");
      return;
    }

    setSaving(true);
    try {
      // Save to legacy ai-provider endpoint (keeps creator_profiles in sync)
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

      // Also save to provider keys table (if key provided)
      if (apiKey) {
        await fetch("/api/settings/provider-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            setActive: true,
          }),
        });
      } else {
        // Just switch active provider
        await fetch("/api/settings/provider-keys", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
      }

      toast.success("AI provider settings saved.");
      setSavedProvider(provider);
      setSavedModel(selectedModel);
      if (apiKey) setKeyConfigured(true);
      setApiKey("");
      setTestResult(null);
      loadConfiguredKeys();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to save settings.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleForceGateway(next: boolean) {
    // Optimistic update
    setForceGateway(next);
    setSavingGateway(true);
    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAiGateway: next }),
      });
      if (!res.ok) {
        throw new Error("Failed to update setting");
      }
      toast.success(
        next
          ? "All AI requests will route through Vercel AI Gateway."
          : "Gateway override disabled — using your configured keys."
      );
    } catch {
      // Revert on failure
      setForceGateway(!next);
      toast.error("Failed to update gateway setting.");
    } finally {
      setSavingGateway(false);
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
    } catch {
      setTestResult("error");
      toast.error("Failed to test API key.");
    } finally {
      setTesting(false);
    }
  }

  const activeProviderLabel = AI_PROVIDERS.find(
    (p) => p.value === savedProvider
  )?.label;

  const activeModelLabel =
    getAvailableModels(savedProvider as AIProvider).find(
      (m) => m.value === (savedModel ?? getDefaultModel(savedProvider as AIProvider))
    )?.label;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Active provider status */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <div
          className={cn(
            "size-2 rounded-full",
            keyConfigured ? "bg-green-500" : "bg-amber-500"
          )}
        />
        <span className="text-sm">
          <span className="font-medium">{activeProviderLabel}</span>
          {activeModelLabel && (
            <span className="text-muted-foreground"> / {activeModelLabel}</span>
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
            {AI_PROVIDERS.map((p) => (
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
          onValueChange={(v) => { if (v) setSelectedModel(v); }}
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
        <APIKeyHelpDrawer open={helpDrawerOpen} onOpenChange={setHelpDrawerOpen} />
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

      {/* Force AI Gateway (testing/dev aid) */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Advanced
        </Label>
        <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2.5">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Zap className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-medium">Force Vercel AI Gateway</div>
              <p className="text-xs text-muted-foreground">
                Route all AI requests through the gateway instead of your
                configured keys. Useful for testing gateway routing without
                removing your BYOK keys.
              </p>
            </div>
          </div>
          <Switch
            checked={forceGateway}
            onCheckedChange={handleToggleForceGateway}
            disabled={savingGateway}
            aria-label="Force Vercel AI Gateway"
          />
        </div>
      </div>

      {/* Configured providers list */}
      {configuredKeys.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Configured Providers
          </Label>
          <div className="space-y-1.5">
            {configuredKeys.map((key) => {
              const providerInfo = AI_PROVIDERS.find(
                (p) => p.value === key.provider
              );
              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        key.is_active ? "bg-green-500" : "bg-gray-300"
                      )}
                    />
                    <span className="text-sm font-medium">
                      {providerInfo?.label ?? key.provider}
                    </span>
                    {key.is_active && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!key.is_active && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={async () => {
                            await fetch("/api/settings/provider-keys", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ provider: key.provider }),
                            });
                            setSavedProvider(key.provider);
                            setProvider(key.provider);
                            setSelectedModel(null);
                            setKeyConfigured(true);
                            loadConfiguredKeys();
                            toast.success(`Switched to ${providerInfo?.label ?? key.provider}`);
                          }}
                        >
                          Switch to
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            const res = await fetch("/api/settings/provider-keys", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ provider: key.provider }),
                            });
                            if (res.ok) {
                              loadConfiguredKeys();
                              toast.success(`${providerInfo?.label ?? key.provider} removed`);
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
            })}
          </div>
        </div>
      )}
    </form>
  );
}
