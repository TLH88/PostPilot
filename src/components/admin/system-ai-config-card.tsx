"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Image as ImageIcon, Loader2, Type } from "lucide-react";
import { toast } from "sonner";

type Tier = "free_personal" | "pro_plus";
type Kind = "text" | "image";

interface AIModel {
  provider: string;
  kind: Kind;
  model_id: string;
  label: string;
  is_default: boolean;
  sort_order: number;
}

interface SystemAIDefault {
  tier: Tier;
  kind: Kind;
  provider: string;
  model: string;
  updated_at: string;
  updated_by: string | null;
}

const TIER_META: Record<Tier, { label: string; description: string }> = {
  free_personal: {
    label: "Free + Personal",
    description: "Cost-conscious — applies to Free, Personal, and trial users.",
  },
  pro_plus: {
    label: "Pro & Team (Pro+)",
    description: "Premium — applies to Professional and Team-tier users on managed AI.",
  },
};

const KIND_META: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  perplexity: "Perplexity",
};

export function SystemAIConfigCard() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [defaults, setDefaults] = useState<SystemAIDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [modelsRes, defaultsRes] = await Promise.all([
        fetch("/api/admin/ai-models"),
        fetch("/api/admin/system-ai-defaults"),
      ]);
      if (modelsRes.ok) {
        const d = await modelsRes.json();
        setModels((d.models as AIModel[]) ?? []);
      }
      if (defaultsRes.ok) {
        const d = await defaultsRes.json();
        setDefaults((d.defaults as SystemAIDefault[]) ?? []);
      }
    } catch {
      toast.error("Failed to load AI defaults");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const modelsByKind = useMemo(() => {
    const out: Record<Kind, AIModel[]> = { text: [], image: [] };
    for (const m of models) out[m.kind].push(m);
    return out;
  }, [models]);

  function defaultFor(tier: Tier, kind: Kind): SystemAIDefault | undefined {
    return defaults.find((d) => d.tier === tier && d.kind === kind);
  }

  async function save(tier: Tier, kind: Kind, provider: string, model: string) {
    const key = `${tier}-${kind}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/system-ai-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, kind, provider, model }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`Updated ${TIER_META[tier].label} ${KIND_META[kind].label.toLowerCase()} default`);
      load();
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="size-4 text-primary" />
          System AI Defaults (Vercel AI Gateway)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Default provider + model for every system-key call, by tier and content type.
          The model list comes from the gateway-backed{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ai_models</code>{" "}
          table — only providers/models registered with the gateway appear here. BYOK
          users (Pro / Team with their own API key) are unaffected.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(TIER_META) as Tier[]).map((tier) => (
              <div key={tier} className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-semibold">{TIER_META[tier].label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {TIER_META[tier].description}
                  </p>
                </div>

                {(Object.keys(KIND_META) as Kind[]).map((kind) => {
                  const current = defaultFor(tier, kind);
                  const kindModels = modelsByKind[kind];
                  const KindIcon = KIND_META[kind].icon;
                  const key = `${tier}-${kind}`;
                  const saving = savingKey === key;

                  return (
                    <TierKindSelector
                      key={kind}
                      tier={tier}
                      kind={kind}
                      kindLabel={KIND_META[kind].label}
                      KindIcon={KindIcon}
                      current={current}
                      models={kindModels}
                      onSave={save}
                      saving={saving}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierKindSelector({
  tier,
  kind,
  kindLabel,
  KindIcon,
  current,
  models,
  onSave,
  saving,
}: {
  tier: Tier;
  kind: Kind;
  kindLabel: string;
  KindIcon: React.ComponentType<{ className?: string }>;
  current: SystemAIDefault | undefined;
  models: AIModel[];
  onSave: (tier: Tier, kind: Kind, provider: string, model: string) => void;
  saving: boolean;
}) {
  // Local editing state — only commits when admin clicks Save.
  const [provider, setProvider] = useState(current?.provider ?? "openai");
  const [model, setModel] = useState(current?.model ?? "");

  useEffect(() => {
    if (current) {
      setProvider(current.provider);
      setModel(current.model);
    }
  }, [current?.provider, current?.model]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const m of models) set.add(m.provider);
    return Array.from(set).sort();
  }, [models]);

  const providerModels = useMemo(() => {
    return models.filter((m) => m.provider === provider);
  }, [models, provider]);

  // When provider changes, default to that provider's first / is_default model
  function handleProviderChange(next: string) {
    setProvider(next);
    const candidates = models.filter((m) => m.provider === next);
    const def = candidates.find((m) => m.is_default) ?? candidates[0];
    if (def) setModel(def.model_id);
  }

  const isDirty = !!current && (current.provider !== provider || current.model !== model);

  return (
    <div className="space-y-1.5 rounded-md border bg-background p-2.5">
      <div className="flex items-center gap-1.5">
        <KindIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{kindLabel}</span>
        {isDirty && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Unsaved
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          disabled={saving || providers.length === 0}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p] ?? p}
            </option>
          ))}
        </select>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={saving || providerModels.length === 0}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {providerModels.map((m) => (
            <option key={m.model_id} value={m.model_id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <code className="truncate text-[10px] text-muted-foreground">
          {current ? `${current.provider}/${current.model}` : "—"}
        </code>
        <Button
          size="sm"
          variant={isDirty ? "default" : "outline"}
          onClick={() => onSave(tier, kind, provider, model)}
          disabled={!isDirty || saving || !model}
          className="h-6 px-2 text-[11px]"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
