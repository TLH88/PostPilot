"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Target, Megaphone, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspaceId } from "@/lib/workspace";
import { toast } from "sonner";

const STEPS = [
  { icon: Building2, label: "Brand Info" },
  { icon: Target, label: "Audience" },
  { icon: Megaphone, label: "Voice & Pillars" },
] as const;

export function WorkspaceSetupWizard() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Brand info
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [uvp, setUvp] = useState("");

  // Step 2: Audience
  const [targetAudience, setTargetAudience] = useState("");
  const [demographics, setDemographics] = useState("");

  // Step 3: Voice & Pillars
  const [voiceGuidelines, setVoiceGuidelines] = useState("");
  const [pillarsInput, setPillarsInput] = useState("");

  async function handleComplete() {
    if (!brandName.trim()) {
      toast.error("Please enter a brand name.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const pillars = pillarsInput
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: brandName.trim(),
          owner_id: user.id,
          brand_name: brandName.trim(),
          brand_industry: industry.trim() || null,
          brand_product_or_service: productOrService.trim() || null,
          brand_uvp: uvp.trim() || null,
          brand_target_audience: targetAudience.trim() || null,
          brand_demographics: demographics.trim() || null,
          brand_voice_guidelines: voiceGuidelines.trim() || null,
          brand_content_pillars: pillars,
        })
        .select("id")
        .single();

      if (wsError) throw wsError;

      // Add creator as owner member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "owner",
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Set as active workspace
      setActiveWorkspaceId(workspace.id);

      toast.success(`Workspace "${brandName.trim()}" created!`);
      router.push("/dashboard");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error("Workspace creation error:", errMsg);
      toast.error(`Failed to create workspace: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="size-3" /> : <Icon className="size-3" />}
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Step 1: Brand Info */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="brand-name" className="text-sm font-medium">
                  Brand / Team Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Acme Corp, Marketing Team"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry" className="text-sm font-medium">Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., SaaS, Healthcare, Fintech"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product" className="text-sm font-medium">Product or Service</Label>
                <Input
                  id="product"
                  value={productOrService}
                  onChange={(e) => setProductOrService(e.target.value)}
                  placeholder="e.g., Cloud security platform, HR consulting"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uvp" className="text-sm font-medium">Unique Value Proposition</Label>
                <textarea
                  id="uvp"
                  rows={3}
                  value={uvp}
                  onChange={(e) => setUvp(e.target.value)}
                  placeholder="What makes your brand unique? What problem do you solve better than anyone else?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {/* Step 2: Audience */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="audience" className="text-sm font-medium">Target Audience</Label>
                <textarea
                  id="audience"
                  rows={3}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who are you trying to reach? e.g., CTOs at mid-market SaaS companies, HR directors at enterprises"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demographics" className="text-sm font-medium">Demographics & Goals</Label>
                <textarea
                  id="demographics"
                  rows={3}
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="Audience demographics, geographic focus, company size, seniority level, engagement goals"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {/* Step 3: Voice & Pillars */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="voice" className="text-sm font-medium">Brand Voice Guidelines</Label>
                <textarea
                  id="voice"
                  rows={4}
                  value={voiceGuidelines}
                  onChange={(e) => setVoiceGuidelines(e.target.value)}
                  placeholder="Describe your brand's tone and voice. e.g., Professional but approachable, avoid jargon, use data-driven arguments, always include a CTA"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pillars" className="text-sm font-medium">Content Pillars</Label>
                <Input
                  id="pillars"
                  value={pillarsInput}
                  onChange={(e) => setPillarsInput(e.target.value)}
                  placeholder="Comma-separated, e.g., Product Updates, Thought Leadership, Customer Stories"
                />
                <p className="text-[11px] text-muted-foreground">
                  These are the key themes your brand posts about on LinkedIn.
                </p>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving || !brandName.trim()} className="gap-1.5">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {saving ? "Creating..." : "Create Workspace"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
