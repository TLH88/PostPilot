"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function NewPostButton({ className, label }: { className?: string; label?: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreatePost() {
    setIsCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: "Untitled Post",
          content: "",
          status: "draft",
          hashtags: [],
          character_count: 0,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to create post:", error.message);
        setIsCreating(false);
        return;
      }

      if (data) {
        router.push(`/posts/${data.id}`);
      }
    } catch {
      console.error("Failed to create post");
      setIsCreating(false);
    }
  }

  return (
    <Button onClick={handleCreatePost} disabled={isCreating} className={className ?? "gap-2"}>
      {isCreating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      {isCreating ? "Creating..." : (label ?? "New Post")}
    </Button>
  );
}
