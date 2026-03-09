"use client";

import { useState } from "react";
import { Loader2, Key, FlaskConical, Check, AlertCircle } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getAvailableModels,
  getDefaultModel,
  type AIProvider,
} from "@/lib/ai/providers";

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "openai", label: "OpenAI (GPT-4o)", placeholder: "sk-..." },
  { value: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { value: "perplexity", label: "Perplexity (Sonar)", placeholder: "pplx-..." },
] as const;

interface AIProviderSettingsProps {
  currentProvider: string;
  currentModel: string | null;
  hasExistingKey: boolean;
}

export function AIProviderSettings({
  currentProvider,
  currentModel,
  hasExistingKey,
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
  const [savedModel, setSavedModel] = useState<string | null>(currentModel);
  const [keyConfigured, setKeyConfigured] = useState(hasExistingKey);

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

      toast.success("AI provider settings saved.");
      setSavedProvider(provider);
      setSavedModel(selectedModel);
      if (apiKey) setKeyConfigured(true);
      setApiKey("");
      setTestResult(null);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to save settings.";
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
  );
}
