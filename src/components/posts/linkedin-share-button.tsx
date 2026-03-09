"use client";

import { Button } from "@/components/ui/button";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { openLinkedInShare } from "@/lib/linkedin";

interface LinkedInShareButtonProps {
  content: string;
  hashtags: string[];
}

export function LinkedInShareButton({ content, hashtags }: LinkedInShareButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="shrink-0"
      title="Post to LinkedIn"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openLinkedInShare(content, hashtags);
      }}
    >
      <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
    </Button>
  );
}
