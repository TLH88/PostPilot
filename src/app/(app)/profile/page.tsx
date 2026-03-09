"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXPERTISE_SUGGESTIONS, TONE_OPTIONS } from "@/lib/constants";
import type { CreatorProfile } from "@/types";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Upload,
  FileText,
  X,
  Plus,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

const INDUSTRY_SUGGESTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "E-commerce",
  "Real Estate",
  "Manufacturing",
  "Consulting",
  "Media",
  "Legal",
  "Government",
  "Non-profit",
];

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8 px-4">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border p-6 space-y-4">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [customExpertise, setCustomExpertise] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState("");
  const [writingTone, setWritingTone] = useState("professional");
  const [voiceSamples, setVoiceSamples] = useState(["", "", ""]);
  const [preferredPostLength, setPreferredPostLength] = useState("medium");
  const [useEmojis, setUseEmojis] = useState(true);
  const [useHashtags, setUseHashtags] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const p = profile as CreatorProfile;
        setFullName(p.full_name ?? "");
        setHeadline(p.headline ?? "");
        setLinkedinUrl(p.linkedin_url ?? "");
        setResumeText(p.resume_text ?? "");
        setLinkedinAbout(p.linkedin_about ?? "");
        setExpertiseAreas(p.expertise_areas ?? []);
        setIndustries(p.industries ?? []);
        setTargetAudience(p.target_audience ?? "");
        setContentPillars(p.content_pillars ?? []);
        setWritingTone(p.writing_tone ?? "professional");
        setPreferredPostLength(p.preferred_post_length ?? "medium");
        setUseEmojis(p.use_emojis ?? true);
        setUseHashtags(p.use_hashtags ?? true);

        // Pad voice samples to always have 3 slots
        const samples = p.voice_samples ?? [];
        setVoiceSamples([
          samples[0] ?? "",
          samples[1] ?? "",
          samples[2] ?? "",
        ]);
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file || file.type !== "application/pdf") return;
      if (!userId) return;

      setUploadingResume(true);
      setUploadedFileName(file.name);

      try {
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(`${userId}/resume.pdf`, file, { upsert: true });

        if (uploadError) throw uploadError;

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/profile/parse-resume", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to parse resume");

        const { text } = await response.json();
        setResumeText(text);
        toast.success("Resume uploaded and parsed successfully.");
      } catch (error) {
        console.error("Resume upload error:", error);
        setUploadedFileName(null);
        toast.error("Failed to process resume. Please try again.");
      } finally {
        setUploadingResume(false);
      }
    },
    [userId, supabase.storage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const addCustomExpertise = () => {
    const trimmed = customExpertise.trim();
    if (trimmed && !expertiseAreas.includes(trimmed)) {
      setExpertiseAreas((prev) => [...prev, trimmed]);
      setCustomExpertise("");
    }
  };

  const toggleIndustry = (industry: string) => {
    setIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const addCustomIndustry = () => {
    const trimmed = customIndustry.trim();
    if (trimmed && !industries.includes(trimmed)) {
      setIndustries((prev) => [...prev, trimmed]);
      setCustomIndustry("");
    }
  };

  const addPillar = () => {
    const trimmed = newPillar.trim();
    if (trimmed && !contentPillars.includes(trimmed)) {
      setContentPillars((prev) => [...prev, trimmed]);
      setNewPillar("");
    }
  };

  const removePillar = (pillar: string) => {
    setContentPillars((prev) => prev.filter((p) => p !== pillar));
  };

  const updateVoiceSample = (index: number, value: string) => {
    setVoiceSamples((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);

    try {
      const profileData = {
        user_id: userId,
        full_name: fullName || null,
        headline: headline || null,
        linkedin_url: linkedinUrl || null,
        resume_text: resumeText || null,
        linkedin_about: linkedinAbout || null,
        expertise_areas: expertiseAreas,
        industries,
        target_audience: targetAudience || null,
        writing_tone: writingTone,
        voice_samples: voiceSamples.filter((s) => s.trim() !== ""),
        content_pillars: contentPillars,
        preferred_post_length: preferredPostLength,
        use_emojis: useEmojis,
        use_hashtags: useHashtags,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("creator_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Creator Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile details and content preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Section 1: Basic Info */}
      <CollapsibleCard
        title="Basic Information"
        description="Your public-facing professional details."
      >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="VP of Engineering at Acme"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
            <Input
              id="linkedinUrl"
              placeholder="https://linkedin.com/in/janesmith"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
      </CollapsibleCard>

      {/* Section 2: Background */}
      <CollapsibleCard
        title="Professional Background"
        description="Your experience helps us generate more authentic content."
        defaultOpen={false}
      >
          <div className="space-y-2">
            <Label>Resume / CV</Label>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              {uploadingResume ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Processing your resume...</span>
                </div>
              ) : uploadedFileName ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{uploadedFileName}</span>
                  <button
                    onClick={() => {
                      setUploadedFileName(null);
                    }}
                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drag and drop your PDF resume here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumeText">Resume Text</Label>
            <Textarea
              id="resumeText"
              placeholder="Paste your resume or a summary of your professional experience..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinAbout">LinkedIn About Section</Label>
            <Textarea
              id="linkedinAbout"
              placeholder="Paste your LinkedIn About section here..."
              value={linkedinAbout}
              onChange={(e) => setLinkedinAbout(e.target.value)}
              className="min-h-24"
            />
          </div>
      </CollapsibleCard>

      {/* Section 3: Expertise & Audience */}
      <CollapsibleCard
        title="Expertise & Audience"
        description="Define your knowledge areas and who you write for."
        defaultOpen={false}
      >
          {/* Expertise Areas */}
          <div className="space-y-3">
            <Label>Areas of Expertise</Label>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_SUGGESTIONS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleExpertise(area)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    expertiseAreas.includes(area)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {expertiseAreas.includes(area) && (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  {area}
                </button>
              ))}
              {expertiseAreas
                .filter(
                  (a) =>
                    !EXPERTISE_SUGGESTIONS.includes(
                      a as (typeof EXPERTISE_SUGGESTIONS)[number]
                    )
                )
                .map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleExpertise(area)}
                    className="inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {area}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom expertise..."
                value={customExpertise}
                onChange={(e) => setCustomExpertise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomExpertise();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="default"
                onClick={addCustomExpertise}
                disabled={!customExpertise.trim()}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-3">
            <Label>Industries</Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_SUGGESTIONS.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => toggleIndustry(industry)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    industries.includes(industry)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {industries.includes(industry) && (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  {industry}
                </button>
              ))}
              {industries
                .filter((i) => !INDUSTRY_SUGGESTIONS.includes(i))
                .map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => toggleIndustry(industry)}
                    className="inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {industry}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom industry..."
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomIndustry();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="default"
                onClick={addCustomIndustry}
                disabled={!customIndustry.trim()}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              placeholder="Describe who you want to reach..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="min-h-20"
            />
          </div>
      </CollapsibleCard>

      {/* Section 4: Voice & Style */}
      <CollapsibleCard
        title="Voice & Style"
        description="Fine-tune how your generated content sounds and looks."
        defaultOpen={false}
      >
          {/* Content Pillars */}
          <div className="space-y-3">
            <Label>Content Pillars</Label>
            <p className="text-xs text-muted-foreground">
              Key themes you consistently write about.
            </p>
            {contentPillars.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contentPillars.map((pillar) => (
                  <Badge
                    key={pillar}
                    variant="secondary"
                    className="gap-1 pl-2.5 pr-1"
                  >
                    {pillar}
                    <button
                      onClick={() => removePillar(pillar)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a content pillar..."
                value={newPillar}
                onChange={(e) => setNewPillar(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPillar();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="default"
                onClick={addPillar}
                disabled={!newPillar.trim()}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Writing Tone */}
          <div className="space-y-2">
            <Label>Writing Tone</Label>
            <Select value={writingTone} onValueChange={(v) => { if (v) setWritingTone(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Samples */}
          <div className="space-y-3">
            <Label>Voice Samples</Label>
            <p className="text-xs text-muted-foreground">
              Paste up to 3 examples of your writing so we can learn your style.
            </p>
            {voiceSamples.map((sample, index) => (
              <div key={index} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Sample {index + 1}
                </span>
                <Textarea
                  placeholder="Paste an example of your writing..."
                  value={sample}
                  onChange={(e) => updateVoiceSample(index, e.target.value)}
                  className="min-h-20"
                />
              </div>
            ))}
          </div>

          {/* Preferred Post Length */}
          <div className="space-y-3">
            <Label>Preferred Post Length</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "short", label: "Short", desc: "Under 500 chars" },
                { value: "medium", label: "Medium", desc: "500-1500 chars" },
                { value: "long", label: "Long", desc: "1500-3000 chars" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferredPostLength(option.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border p-3 text-center transition-colors ${
                    preferredPostLength === option.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="useEmojis" className="cursor-pointer">
                  Use Emojis
                </Label>
                <p className="text-xs text-muted-foreground">
                  Include emojis in generated posts
                </p>
              </div>
              <Switch
                id="useEmojis"
                checked={useEmojis}
                onCheckedChange={setUseEmojis}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="useHashtags" className="cursor-pointer">
                  Use Hashtags
                </Label>
                <p className="text-xs text-muted-foreground">
                  Append relevant hashtags to posts
                </p>
              </div>
              <Switch
                id="useHashtags"
                checked={useHashtags}
                onCheckedChange={setUseHashtags}
              />
            </div>
          </div>
      </CollapsibleCard>

      {/* Bottom Save Button */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
