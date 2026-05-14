import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Key } from "lucide-react";
import { SystemAIConfigCard } from "@/components/admin/system-ai-config-card";
import { AdminUsersCard } from "@/components/admin/admin-users-card";

function maskKey(key: string | undefined): string {
  if (!key) return "Not configured";
  if (key.length < 12) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export default function AdminSystemPage() {
  const systemKeys = [
    { provider: "OpenAI", env: "SYSTEM_AI_KEY_OPENAI", value: process.env.SYSTEM_AI_KEY_OPENAI },
    { provider: "Anthropic", env: "SYSTEM_AI_KEY_ANTHROPIC", value: process.env.SYSTEM_AI_KEY_ANTHROPIC },
    { provider: "Google", env: "SYSTEM_AI_KEY_GOOGLE", value: process.env.SYSTEM_AI_KEY_GOOGLE },
    { provider: "Perplexity", env: "SYSTEM_AI_KEY_PERPLEXITY", value: process.env.SYSTEM_AI_KEY_PERPLEXITY },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Default AI selections, system keys, and admin access.</p>
      </div>

      {/* Default system AI provider + model per tier × kind (admin-editable, DB-backed) */}
      <SystemAIConfigCard />

      {/* System AI Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="size-4 text-primary" />
            System AI Keys (Managed Access)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            These keys are used for trial/beta users who don&apos;t have their own API keys configured.
          </p>
          <div className="space-y-2">
            {systemKeys.map((key) => (
              <div key={key.env} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {key.value ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <X className="size-4 text-muted-foreground/40" />
                  )}
                  <span className="text-sm font-medium">{key.provider}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {maskKey(key.value)}
                  </code>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${key.value ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
                  >
                    {key.value ? "Active" : "Missing"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin users (env-var bootstrap + DB-managed list) */}
      <AdminUsersCard />
    </div>
  );
}
