import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Key, Server } from "lucide-react";

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

  const envStatus = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", set: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: "SUPABASE_SERVICE_ROLE_KEY", set: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: "ENCRYPTION_KEY", set: !!process.env.ENCRYPTION_KEY },
    { name: "ADMIN_EMAILS", set: !!process.env.ADMIN_EMAILS },
    { name: "LINKEDIN_CLIENT_ID", set: !!process.env.LINKEDIN_CLIENT_ID },
    { name: "LINKEDIN_CLIENT_SECRET", set: !!process.env.LINKEDIN_CLIENT_SECRET },
  ];

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Environment configuration and system-level AI key status.</p>
      </div>

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

      {/* Admin Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4 text-red-500" />
            Admin Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Users with admin panel access (ADMIN_EMAILS env var).
          </p>
          {adminEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin emails configured.</p>
          ) : (
            <div className="space-y-1.5">
              {adminEmails.map((email) => (
                <div key={email} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Shield className="size-3.5 text-red-500" />
                  <span className="text-sm">{email}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="size-4 text-blue-500" />
            Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {envStatus.map((env) => (
              <div key={env.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                <code className="text-xs">{env.name}</code>
                {env.set ? (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Set
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                    Missing
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
