"use client";

import { useState } from "react";
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe } from "lucide-react";
import { LINKEDIN } from "@/lib/constants";

interface LinkedInPreviewProps {
  content: string;
  title?: string | null;
  authorName: string;
  authorHeadline: string;
}

export function LinkedInPreview({
  content,
  title,
  authorName,
  authorHeadline,
  truncate = false,
}: LinkedInPreviewProps & { truncate?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  // Build full post text as it will appear on LinkedIn
  const fullContent =
    title && title !== "Untitled Post"
      ? `${title}\n\n${content}`
      : content;

  const shouldTruncate = truncate && fullContent.length > LINKEDIN.HOOK_VISIBLE_LENGTH;
  const displayContent =
    shouldTruncate && !expanded
      ? fullContent.slice(0, LINKEDIN.HOOK_VISIBLE_LENGTH)
      : fullContent;

  return (
    <div className="mx-auto w-full max-w-[552px] rounded-lg bg-white shadow-sm ring-1 ring-black/10">
      {/* Author Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-600">
          {authorName
            ? authorName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {authorName || "Your Name"}
          </p>
          <p className="truncate text-xs text-gray-500 leading-tight mt-0.5">
            {authorHeadline || "Your headline"}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <span>1d</span>
            <span>&#183;</span>
            <Globe className="size-3" />
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pt-3 pb-1">
        <div className="whitespace-pre-wrap break-words text-sm text-gray-900 leading-[1.42857]">
          {displayContent}
          {shouldTruncate && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-gray-500 hover:text-blue-600 hover:underline"
            >
              ...see more
            </button>
          )}
        </div>
      </div>

      {/* Engagement Stats (subtle) */}
      <div className="mx-4 flex items-center justify-between border-b border-gray-200 py-2">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white ring-1 ring-white">
              <ThumbsUp className="size-2.5" />
            </span>
          </div>
          <span className="text-xs text-gray-500">42</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>3 comments</span>
          <span>1 repost</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-2 py-1">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <ThumbsUp className="size-4" />
          <span>Like</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <MessageCircle className="size-4" />
          <span>Comment</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <Repeat2 className="size-4" />
          <span>Repost</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100">
          <Send className="size-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
