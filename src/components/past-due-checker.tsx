"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { openLinkedInShare } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";

interface PastDuePost {
  id: string;
  title: string | null;
  content: string;
  hashtags: string[];
  scheduled_for: string;
}

export function PastDueChecker() {
  const [posts, setPosts] = useState<PastDuePost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const supabase = createClient();

  const checkPastDue = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("posts")
      .select("id, title, content, hashtags, scheduled_for")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .lt("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true });

    if (data && data.length > 0) {
      setPosts(data);
      setCurrentIndex(0);
      setOpen(true);
    }
  }, [supabase]);

  useEffect(() => {
    checkPastDue();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkPastDue();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkPastDue]);

  const current = posts[currentIndex];
  if (!current) return null;

  const displayTitle =
    current.title ||
    (current.content
      ? current.content.slice(0, 60) + (current.content.length > 60 ? "..." : "")
      : "Untitled Post");

  const contentSummary =
    current.content.length > 150
      ? current.content.slice(0, 150) + "..."
      : current.content;

  const scheduledDate = new Date(current.scheduled_for).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  function moveToNext() {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setOpen(false);
    }
  }

  async function handleConfirmPosted() {
    await supabase
      .from("posts")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", current.id);
    moveToNext();
  }

  async function handleNotYet() {
    await supabase
      .from("posts")
      .update({ status: "past_due" })
      .eq("id", current.id);
    moveToNext();
  }

  function handleShareNow() {
    openLinkedInShare(current.content, current.hashtags ?? []);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Scheduled Post Past Due</DialogTitle>
          <DialogDescription>
            This post was scheduled for {scheduledDate}. Did you post it to LinkedIn?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">{displayTitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {contentSummary}
          </p>
          <p className="text-xs text-muted-foreground">
            Scheduled: {scheduledDate}
          </p>
        </div>

        {posts.length > 1 && (
          <p className="text-xs text-muted-foreground text-center">
            Post {currentIndex + 1} of {posts.length}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleNotYet}>
            Not yet
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleShareNow}
          >
            <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
            Post to LinkedIn now
          </Button>
          <Button onClick={handleConfirmPosted}>
            Yes, I posted it to LinkedIn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
