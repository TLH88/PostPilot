"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Minimum editor body height. Use 180 for compact contexts (default),
   * larger values for expanded composer views. Tailwind arbitrary class
   * is applied via min-h-[Npx].
   */
  minHeightPx?: number;
}

/**
 * TipTap-based rich text editor scoped to email-safe formatting:
 * paragraph, bold, italic, link, H2/H3, bullet + ordered lists.
 *
 * Outputs HTML that the server sanitizes via DOMPurify before render +
 * persistence. Do not loosen the extension list without re-evaluating
 * the server-side sanitizer allow-list.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your message…",
  className,
  disabled = false,
  minHeightPx = 180,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Drop features that don't render cleanly in email clients
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full rounded-md my-2",
        },
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontFamily.configure({ types: ["textStyle"] }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none px-3 py-2 outline-none",
          "[&_p]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1",
          "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:text-primary [&_a]:underline",
        ),
        style: `min-height:${minHeightPx}px`,
        "data-placeholder": placeholder,
      },
    },
  });

  // Sync external value changes (e.g. reset to empty after send)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <Toolbar editor={editor} />
      <div className="border-t">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-7 w-7", active && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

/** Email-safe font families: web-safe (universal) + Google Fonts via @import in body fallback. */
const FONT_FAMILIES: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
];

/** Curated palette — broadly readable, accessible against white. */
const COLOR_SWATCHES: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Black", value: "#0f172a" },
  { label: "Gray", value: "#64748b" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Purple", value: "#9333ea" },
  { label: "Pink", value: "#db2777" },
];

function Toolbar({ editor }: { editor: Editor }) {
  function promptLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function promptImage() {
    const url = window.prompt("Image URL (https only)", "https://");
    if (!url || url.trim() === "" || url === "https://") return;
    if (!/^https:\/\//i.test(url)) {
      // eslint-disable-next-line no-alert
      alert("Image URL must use https://");
      return;
    }
    editor.chain().focus().setImage({ src: url, alt: "" }).run();
  }

  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) ?? null;
  const currentFont = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1">
      {/* Inline marks */}
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline"
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="size-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Headings */}
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Heading 3"
      >
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Font family"
              className="h-7 px-1.5 gap-1 text-[11px] font-normal"
            />
          }
        >
          <Type className="size-3.5" />
          <span className="hidden sm:inline">{FONT_FAMILIES.find((f) => f.value === currentFont)?.label ?? "Font"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Font family</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FONT_FAMILIES.map((f) => (
              <DropdownMenuItem
                key={f.label}
                onClick={() => {
                  if (f.value === null) editor.chain().focus().unsetFontFamily().run();
                  else editor.chain().focus().setFontFamily(f.value).run();
                }}
                className={currentFont === f.value ? "bg-accent font-semibold" : ""}
              >
                <span style={f.value ? { fontFamily: f.value } : undefined}>{f.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text color */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Text color"
              className="h-7 w-7 p-0"
            />
          }
        >
          <div className="flex flex-col items-center">
            <Palette className="size-3" />
            <div
              className="h-0.5 w-3 rounded-sm"
              style={{ backgroundColor: currentColor ?? "transparent" }}
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Text color</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="grid grid-cols-6 gap-1 p-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    if (c.value === null) editor.chain().focus().unsetColor().run();
                    else editor.chain().focus().setColor(c.value).run();
                  }}
                  aria-label={c.label}
                  title={c.label}
                  className={cn(
                    "size-5 rounded border transition-transform hover:scale-110",
                    currentColor === c.value && "ring-2 ring-primary ring-offset-1",
                    c.value === null && "bg-white text-foreground text-[8px] flex items-center justify-center",
                  )}
                  style={c.value ? { backgroundColor: c.value } : undefined}
                >
                  {c.value === null && "×"}
                </button>
              ))}
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Alignment */}
      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        label="Align left"
      >
        <AlignLeft className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        label="Align center"
      >
        <AlignCenter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        label="Align right"
      >
        <AlignRight className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        label="Justify"
      >
        <AlignJustify className="size-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Lists */}
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Link + image */}
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={promptLink}
        label="Link"
      >
        <LinkIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        onClick={promptImage}
        label="Insert image (URL)"
      >
        <ImageIcon className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
