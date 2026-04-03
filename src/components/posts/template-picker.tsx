"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { PostTemplate } from "@/types";

interface TemplatePickerProps {
  onSelect: (structure: string) => void;
}

type Tab = "builtin" | "mine" | "community";

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("builtin");
  const [preview, setPreview] = useState<PostTemplate | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase
      .from("post_templates")
      .select("*")
      .order("name");
    setTemplates(data ?? []);
    setLoading(false);
  }

  function handleUse(template: PostTemplate) {
    onSelect(template.structure);
    setOpen(false);
    setPreview(null);
  }

  const { data: { user } } = { data: { user: null as { id: string } | null } };

  // Get current user for filtering
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase]);

  const builtin = templates.filter((t) => t.is_builtin);
  const mine = templates.filter((t) => !t.is_builtin && t.user_id === userId);
  const community = templates.filter(
    (t) => t.is_shared && !t.is_builtin && t.user_id !== userId
  );

  const displayed =
    tab === "builtin" ? builtin : tab === "mine" ? mine : community;

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "builtin", label: "Built-in", count: builtin.length, icon: <Sparkles className="size-3" /> },
    { id: "mine", label: "My Templates", count: mine.length, icon: <FileText className="size-3" /> },
    { id: "community", label: "Community", count: community.length, icon: <Users className="size-3" /> },
  ];

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <FileText className="size-4" />
        Use Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a proven post structure. Fill in the brackets with your content.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setPreview(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : preview ? (
              /* Template preview */
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{preview.name}</h3>
                    {preview.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preview.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview(null)}
                    >
                      Back
                    </Button>
                    <Button size="sm" onClick={() => handleUse(preview)}>
                      Use Template
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground">
                    {preview.structure}
                  </pre>
                </div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {tab === "mine"
                    ? "You haven't saved any templates yet. Use \"Save as Template\" in the post editor."
                    : tab === "community"
                      ? "No shared templates yet."
                      : "No templates available."}
                </p>
              </div>
            ) : (
              /* Template grid */
              <div className="grid gap-2 p-2">
                {displayed.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setPreview(template)}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.is_builtin && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Built-in
                        </Badge>
                      )}
                      {template.content_pillar && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {template.content_pillar}
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
