"use client";

/**
 * Single consolidated icon-only toolbar for the post editor.
 *
 * Replaces the cluster of separate buttons (Emoji, Format, Library, Enhance,
 * Show/Hide AI Panel) that used to live around the editor. Every action is
 * an icon with a tooltip; secondary surfaces (emoji picker, enhance menu)
 * open as popovers/dropdowns.
 *
 * Gating: hashtag suggest and Save-to-Library are disabled when the user's
 * tier doesn't have the matching feature, but still rendered (so the icon
 * stays in a stable position) — the tooltip explains the gate.
 */

import {
  List,
  ListOrdered,
  Hash,
  BookmarkPlus,
  Wand2,
  MessageSquare,
  PanelRightClose,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiPicker } from "@/components/posts/emoji-picker";
import {
  ENHANCEMENT_TEMPLATE_LIST,
  type EnhancementTemplateKey,
} from "@/lib/ai/enhancement-templates";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  // Emoji
  onInsertEmoji: (emoji: string) => void;

  // Lists (insert markers at cursor)
  onInsertBulletList: () => void;
  onInsertNumberedList: () => void;

  // Hashtags
  onSuggestHashtags: () => void;
  hashtagsBusy?: boolean;
  hashtagsDisabled?: boolean;
  hashtagsDisabledReason?: string;

  // Save to Library
  onSaveToLibrary: () => void;
  saveToLibraryDisabled?: boolean;
  saveToLibraryDisabledReason?: string;

  // AI Enhance (dropdown of all templates)
  onRunEnhancement: (key: EnhancementTemplateKey) => void;
  enhancing?: boolean;
  enhancingTemplate?: EnhancementTemplateKey | null;
  enhanceDisabled?: boolean;
  enhanceDisabledReason?: string;

  // AI Chat panel toggle
  onToggleAIChat: () => void;
  aiChatOpen?: boolean;

  className?: string;
}

function IconBtn({
  tooltip,
  onClick,
  disabled,
  active,
  children,
}: {
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "size-10 rounded-md",
              active && "bg-accent text-accent-foreground",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({
  onInsertEmoji,
  onInsertBulletList,
  onInsertNumberedList,
  onSuggestHashtags,
  hashtagsBusy,
  hashtagsDisabled,
  hashtagsDisabledReason,
  onSaveToLibrary,
  saveToLibraryDisabled,
  saveToLibraryDisabledReason,
  onRunEnhancement,
  enhancing,
  enhancingTemplate,
  enhanceDisabled,
  enhanceDisabledReason,
  onToggleAIChat,
  aiChatOpen,
  className,
}: EditorToolbarProps) {
  return (
    <div
      id="tour-formatting-toolbar"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border bg-card/60 px-2 py-1.5 shadow-sm",
        className,
      )}
    >
      {/* Emoji — uses the existing picker in icon-only mode */}
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <EmojiPicker onSelect={onInsertEmoji} iconOnly />
        </TooltipTrigger>
        <TooltipContent side="top">Insert emoji</TooltipContent>
      </Tooltip>

      <IconBtn tooltip="Bullet list" onClick={onInsertBulletList}>
        <List className="size-5" />
      </IconBtn>

      <IconBtn tooltip="Numbered list" onClick={onInsertNumberedList}>
        <ListOrdered className="size-5" />
      </IconBtn>

      <IconBtn
        tooltip={
          hashtagsDisabled
            ? hashtagsDisabledReason ?? "Suggest hashtags"
            : hashtagsBusy
              ? "Suggesting hashtags…"
              : "Suggest hashtags"
        }
        onClick={onSuggestHashtags}
        disabled={hashtagsDisabled || hashtagsBusy}
      >
        {hashtagsBusy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Hash className="size-5" />
        )}
      </IconBtn>

      <IconBtn
        tooltip={
          saveToLibraryDisabled
            ? saveToLibraryDisabledReason ?? "Save to Library"
            : "Save to Library"
        }
        onClick={onSaveToLibrary}
        disabled={saveToLibraryDisabled}
      >
        <BookmarkPlus className="size-5" />
      </IconBtn>

      {/* AI Enhance — dropdown of all templates */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    disabled={enhanceDisabled || enhancing}
                    className="size-10 rounded-md"
                  />
                }
              />
            }
          >
            {enhancing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Wand2 className="size-5" />
            )}
          </TooltipTrigger>
          <TooltipContent side="top">
            {enhanceDisabled
              ? enhanceDisabledReason ?? "AI Enhance"
              : enhancing
                ? "Enhancing…"
                : "AI Enhance"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72 whitespace-normal">
          <DropdownMenuGroup>
            <DropdownMenuLabel>AI Enhance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ENHANCEMENT_TEMPLATE_LIST.map((tmpl) => (
              <DropdownMenuItem
                key={tmpl.key}
                onClick={() => onRunEnhancement(tmpl.key)}
                disabled={enhancing}
              >
                <Wand2
                  className={cn(
                    "size-3.5 mr-2 mt-0.5 shrink-0",
                    enhancingTemplate === tmpl.key && "animate-spin",
                  )}
                />
                <div className="flex flex-col">
                  <span>{tmpl.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {tmpl.subtext}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Post Pilot AI panel toggle */}
      <IconBtn
        tooltip={aiChatOpen ? "Hide Post Pilot AI" : "Show Post Pilot AI"}
        onClick={onToggleAIChat}
        active={aiChatOpen}
      >
        {aiChatOpen ? (
          <PanelRightClose className="size-5" />
        ) : (
          <MessageSquare className="size-5" />
        )}
      </IconBtn>
    </div>
  );
}
