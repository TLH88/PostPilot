"use client";

import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POST_STATUSES } from "@/lib/constants";
import { FileEdit, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import type { Post } from "@/types";

interface PostPreviewSheetProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  authorHeadline: string;
  onEdit: (post: Post) => void;
}

export function PostPreviewSheet({
  post,
  open,
  onOpenChange,
  authorName,
  authorHeadline,
  onEdit,
}: PostPreviewSheetProps) {
  if (!post) return null;

  const status = POST_STATUSES[post.status as keyof typeof POST_STATUSES];
  const scheduledDate = post.scheduled_for
    ? new Date(post.scheduled_for)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[600px] flex flex-col overflow-hidden"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            {status && (
              <Badge
                variant="secondary"
                className={`${status.color} text-[10px]`}
              >
                {status.label}
              </Badge>
            )}
            {scheduledDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="size-3" />
                {format(scheduledDate, "MMM d, yyyy")} at{" "}
                {format(scheduledDate, "h:mm a")}
              </span>
            )}
          </div>
          <SheetTitle className="line-clamp-2">
            {post.title || "Untitled Post"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Preview of post
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <LinkedInPreview
            content={post.content || ""}
            title={post.title}
            imageUrl={post.image_url}
            authorName={authorName}
            authorHeadline={authorHeadline}
            truncate
          />

          {/* Content pillars */}
          {(post.content_pillars ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(post.content_pillars ?? []).map((pillar: string) => (
                <Badge key={pillar} variant="outline" className="text-[10px]">
                  {pillar}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
          <Button
            variant="default"
            onClick={() => onEdit(post)}
            className="gap-1.5"
          >
            <FileEdit className="size-3.5" />
            Edit Post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
