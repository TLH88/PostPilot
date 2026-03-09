"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EXPERTISE_SUGGESTIONS, TONE_OPTIONS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  X,
  Plus,
  Loader2,
  User,
  Briefcase,
  Target,
  Pen,
  Sparkles,
  Shield,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAvailableModels,
  getDefaultModel,
  type AIProvider,
} from "@/lib/ai/providers";

const STEPS = [
  { label: "Basic Info", icon: User },
  { label: "Background", icon: Briefcase },
  { label: "Expertise", icon: Target },
  { label: "Voice & Style", icon: Pen },
  { label: "AI Setup", icon: Sparkles },
] as const;

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "openai", label: "OpenAI (GPT-4o)", placeholder: "sk-..." },
  { value: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { value: "perplexity", label: "Perplexity (Sonar)", placeholder: "pplx-..." },
];

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

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Step 2: Background
  const [resumeText, setResumeText] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");

  // Step 3: Expertise & Audience
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [customExpertise, setCustomExpertise] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Step 5: AI Setup
  const [aiProvider, setAiProvider] = useState("anthropic");
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Step 4: Voice & Style
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState("");
  const [writingTone, setWritingTone] = useState("professional");
  const [voiceSamples, setVoiceSamples] = useState(["", "", ""]);
  const [preferredPostLength, setPreferredPostLength] = useState("medium");
  const [useEmojis, setUseEmojis] = useState(true);
  const [useHashtags, setUseHashtags] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, [supabase.auth]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file || file.type !== "application/pdf") {
        return;
      }

      if (!userId) return;

      setUploadingResume(true);
      setUploadedFileName(file.name);

      try {
        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(`${userId}/resume.pdf`, file, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Parse resume text via API
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/profile/parse-resume", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to parse resume");

        const { text } = await response.json();
        setResumeText(text);
      } catch (error) {
        console.error("Resume upload error:", error);
        setUploadedFileName(null);
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

  const handleTestAiKey = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Please enter an API key first.");
      return;
    }

    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: aiApiKey,
          aiModel: aiModel,
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
      setTestingKey(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;

    setIsSubmitting(true);

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
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("creator_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      // Save AI provider settings (encryption handled server-side)
      try {
        await fetch("/api/settings/ai-provider", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiProvider,
            ...(aiApiKey.trim() ? { apiKey: aiApiKey } : {}),
            aiModel: aiModel,
          }),
        });
      } catch (aiError) {
        console.error("Failed to save AI settings:", aiError);
        // Non-blocking — user can configure later in Settings
      }

      // Force full page reload so the server layout re-fetches the updated profile
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to PostPilot
          </h1>
          <p className="mt-1 text-muted-foreground">
            Let&apos;s set up your profile so we can craft posts that sound like
            you.
          </p>
        </div>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                          ? "border-primary bg-background text-primary"
                          : "border-muted-foreground/30 bg-background text-muted-foreground/50"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                          ? "text-primary"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-2 mb-5 h-0.5 flex-1 transition-colors ${
                        index < currentStep
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Let&apos;s get to know you!
              </CardTitle>
              <CardDescription>
                Tell us the basics so we can personalize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                <p className="text-xs text-muted-foreground">
                  This appears as your tagline on LinkedIn.
                </p>
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
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Share your professional journey
              </CardTitle>
              <CardDescription>
                Help us understand your background to generate more authentic
                content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Resume / CV</Label>
                <p className="text-xs text-muted-foreground">
                  Upload a PDF or paste your resume text below. We&apos;ll use
                  it to understand your experience.
                </p>

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
                      <span className="text-sm">
                        Processing your resume...
                      </span>
                    </div>
                  ) : uploadedFileName ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{uploadedFileName}</span>
                      <button
                        onClick={() => {
                          setUploadedFileName(null);
                          setResumeText("");
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

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">
                  OR
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resumeText">Paste Resume Text</Label>
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
                <p className="text-xs text-muted-foreground">
                  This helps us match your existing voice and tone.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Define your expertise and audience
              </CardTitle>
              <CardDescription>
                This helps us suggest relevant topics and tailor content to your
                readers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Expertise Areas */}
              <div className="space-y-3">
                <Label>Areas of Expertise</Label>
                <p className="text-xs text-muted-foreground">
                  Select the topics you know best. These shape your content
                  recommendations.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Which industries are you most active in?
                </p>
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
                  placeholder="Describe who you want to reach. E.g., 'Mid-level engineering managers at fast-growing startups looking to level up their leadership skills.'"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="min-h-20"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Craft your unique voice
              </CardTitle>
              <CardDescription>
                These preferences help us generate posts that truly sound like
                you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Content Pillars */}
              <div className="space-y-3">
                <Label>Content Pillars</Label>
                <p className="text-xs text-muted-foreground">
                  Key themes you consistently write about (e.g., &quot;team
                  building&quot;, &quot;AI ethics&quot;, &quot;career
                  growth&quot;).
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
                  Paste up to 3 examples of your writing (LinkedIn posts, blog
                  excerpts, etc.) so we can learn your style.
                </p>
                {voiceSamples.map((sample, index) => (
                  <div key={index} className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Sample {index + 1}
                    </span>
                    <Textarea
                      placeholder={`Paste an example of your writing...`}
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
                    {
                      value: "short",
                      label: "Short",
                      desc: "Under 500 chars",
                    },
                    {
                      value: "medium",
                      label: "Medium",
                      desc: "500-1500 chars",
                    },
                    {
                      value: "long",
                      label: "Long",
                      desc: "1500-3000 chars",
                    },
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
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
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
            </CardContent>
          </Card>
        )}

        {/* Step 5: AI Setup */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Connect your AI provider
              </CardTitle>
              <CardDescription>
                Choose your preferred AI model and add your API key to
                power content generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={aiProvider}
                  onValueChange={(v) => {
                    if (v) {
                      setAiProvider(v);
                      setAiModel(null);
                      setTestResult(null);
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

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={
                    aiModel ??
                    getDefaultModel(aiProvider as AIProvider)
                  }
                  onValueChange={(v) => {
                    if (v) setAiModel(v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModels(
                      aiProvider as AIProvider
                    ).map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <Label htmlFor="aiApiKey">API Key</Label>
                <Input
                  id="aiApiKey"
                  type="password"
                  placeholder={
                    AI_PROVIDERS.find((p) => p.value === aiProvider)
                      ?.placeholder ?? "Enter your API key"
                  }
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  autoComplete="off"
                />
              </div>

              {/* Test Key Button */}
              <Button
                type="button"
                variant="outline"
                disabled={testingKey || !aiApiKey.trim()}
                onClick={handleTestAiKey}
                className="gap-1.5"
              >
                {testingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === "success" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : testResult === "error" ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                {testingKey
                  ? "Testing..."
                  : testResult === "success"
                    ? "Key Valid"
                    : "Test Key"}
              </Button>

              {/* Security Note */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Your key is secure
                  </p>
                  <p className="mt-0.5">
                    API keys are encrypted with AES-256-GCM before storage
                    and are only used server-side. They are never exposed
                    to the browser or shared with third parties.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 0 ? (
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length - 1 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                Skip for now
              </Button>
            )}
            <Button onClick={goNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  Complete Setup
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
