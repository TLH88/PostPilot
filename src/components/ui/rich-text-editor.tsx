"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";

/**
 * Adds a `fontSize` attribute to the `textStyle` mark so the toolbar
 * can set inline font sizes. Mirrors how @tiptap/extension-color and
 * @tiptap/extension-font-family extend textStyle.
 */
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  RemoveFormatting,
  ChevronDown,
  Loader2,
  Pilcrow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
   * When true (default), the editor fills its parent's available height
   * via flex and scrolls internally. The parent decides the height; the
   * editor never grows past it. Use false for standalone contexts where
   * the editor should size to its content (e.g. settings dialogs).
   */
  fillParent?: boolean;
  /**
   * Initial height when `fillParent` is false. Sets `min-height` for the
   * editor body so it doesn't collapse below this. Ignored when
   * `fillParent` is true.
   */
  initialHeightPx?: number;
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
  fillParent = false,
  initialHeightPx = 240,
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
      FontSize,
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
          "prose prose-sm max-w-none px-3 py-2 outline-none min-h-full",
          "[&_p]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1",
          "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:text-primary [&_a]:underline",
        ),
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

  // Two sizing modes:
  //   fillParent=true (default): editor fills its parent's flex space and
  //     scrolls internally. Use inside a bounded flex column container so
  //     the editor never causes the parent to grow.
  //   fillParent=false: editor is sized to a fixed initial height (with
  //     internal scroll on overflow). Use in standalone contexts.
  const outerClasses = fillParent
    ? "flex flex-col flex-1 min-h-0 rounded-md border bg-background"
    : "rounded-md border bg-background";
  const bodyClasses = fillParent
    ? "flex-1 min-h-0 overflow-y-auto border-t"
    : "overflow-y-auto border-t";
  const bodyStyle = fillParent
    ? undefined
    : { height: `${initialHeightPx}px`, minHeight: "120px" };

  return (
    <div className={cn(outerClasses, className)}>
      <Toolbar editor={editor} />
      <div className={bodyClasses} style={bodyStyle}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  disabled = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn("h-7 w-7", active && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

/** Font size presets — px values render reliably across email clients. */
const FONT_SIZES: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Small (12px)", value: "12px" },
  { label: "Normal (16px)", value: "16px" },
  { label: "Medium (18px)", value: "18px" },
  { label: "Large (22px)", value: "22px" },
  { label: "Heading (28px)", value: "28px" },
  { label: "Hero (36px)", value: "36px" },
];

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function handleImageFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/email/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Upload failed (HTTP ${res.status})`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) ?? null;
  const currentFont = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? null;
  const currentSize = (editor.getAttributes("textStyle").fontSize as string | undefined) ?? null;

  function applyFontSize(value: string | null) {
    if (value === null) {
      editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontSize: value }).run();
    }
  }

  function applyFontFamily(value: string | null) {
    if (value === null) editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(value).run();
  }

  function clearFormatting() {
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .setTextAlign("left")
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1">
      {/* ── Section 1: Inline marks ───────────────────────────── */}
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold (Ctrl+B)"
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic (Ctrl+I)"
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline (Ctrl+U)"
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

      {/* ── Section 2: Formatting controls ────────────────────── */}
      {/* Reset to default formatting — first in section 2 */}
      <ToolbarButton
        active={false}
        onClick={clearFormatting}
        label="Reset to default formatting"
      >
        <RemoveFormatting className="size-3.5" />
      </ToolbarButton>

      {/* Single 'Formatting' dropdown: text size + font family */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Text size and font"
              aria-label="Text size and font"
              className="h-7 px-1.5 gap-0.5 text-[11px] font-normal"
            />
          }
        >
          <Pilcrow className="size-3.5" />
          <span className="hidden sm:inline">Formatting</span>
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Text size</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FONT_SIZES.map((s) => (
              <DropdownMenuItem
                key={`size-${s.label}`}
                onClick={() => applyFontSize(s.value)}
                className={currentSize === s.value ? "bg-accent font-semibold" : ""}
              >
                <span style={s.value ? { fontSize: s.value, lineHeight: 1.2 } : undefined}>
                  {s.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Font family</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FONT_FAMILIES.map((f) => (
              <DropdownMenuItem
                key={`font-${f.label}`}
                onClick={() => applyFontFamily(f.value)}
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
              title="Text color"
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

      {/* Link + image (upload) */}
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={promptLink}
        label="Insert link"
      >
        <LinkIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        label={uploading ? "Uploading…" : "Upload image"}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />
    </div>
  );
}
