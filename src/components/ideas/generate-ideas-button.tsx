"use client";

import { useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GenerateIdeasDialog } from "@/components/ideas/generate-ideas-dialog";

interface GenerateIdeasButtonProps {
  className?: string;
  id?: string;
}

export function GenerateIdeasButton({ className, id }: GenerateIdeasButtonProps) {
  const [open, setOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadPillars() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("creator_profiles")
        .select("content_pillars")
        .eq("user_id", user.id)
        .single();
      if (data?.content_pillars) setContentPillars(data.content_pillars);
    }
    loadPillars();
  }, [supabase]);

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    // Navigate to ideas page when dialog is closed (user saved ideas and dismissed)
    if (!isOpen && hasSaved) {
      router.push("/ideas");
      setHasSaved(false);
    }
  }

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Lightbulb className="size-4" />
        Generate Ideas
      </button>
      <GenerateIdeasDialog
        open={open}
        onOpenChange={handleOpenChange}
        contentPillars={contentPillars}
        onIdeasSaved={() => setHasSaved(true)}
        onPillarsUpdated={(updated) => setContentPillars(updated)}
      />
    </>
  );
}
