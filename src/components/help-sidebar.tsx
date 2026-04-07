"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { HelpCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Context for opening help from anywhere ──────────────────────────────────

interface HelpSidebarContextValue {
  openHelp: (articleId?: string) => void;
}

const HelpSidebarContext = createContext<HelpSidebarContextValue>({
  openHelp: () => {},
});

export function useHelpSidebar() {
  return useContext(HelpSidebarContext);
}

// ── Provider + Sheet ────────────────────────────────────────────────────────

export function HelpSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [articleId, setArticleId] = useState<string | undefined>();

  const openHelp = useCallback((id?: string) => {
    setArticleId(id);
    setOpen(true);
  }, []);

  return (
    <HelpSidebarContext.Provider value={{ openHelp }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full max-w-lg flex-col p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              Help Center
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-5">
              <HelpContent articleId={articleId} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </HelpSidebarContext.Provider>
  );
}

// ── Inline help trigger button ──────────────────────────────────────────────

export function HelpButton({
  articleId,
  className = "",
}: {
  articleId?: string;
  className?: string;
}) {
  const { openHelp } = useHelpSidebar();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openHelp(articleId);
      }}
      className={`inline-flex items-center text-primary/70 hover:text-primary transition-colors ${className}`}
      title="Open help"
    >
      <HelpCircle className="size-3.5" />
    </button>
  );
}

// ── Help article content ────────────────────────────────────────────────────

function HelpContent({ articleId }: { articleId?: string }) {
  const article = articleId ? HELP_ARTICLES[articleId] : null;

  if (!article) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Select a help topic or visit the full{" "}
          <a href="/help" className="text-primary underline underline-offset-4">
            Help Center
          </a>{" "}
          for detailed guides.
        </p>
        <div className="space-y-2">
          {Object.entries(HELP_ARTICLES).map(([id, art]) => (
            <HelpArticleLink key={id} id={id} title={art.title} description={art.description} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-semibold text-base">{article.title}</h3>
        <p className="text-muted-foreground text-xs mt-1">{article.description}</p>
      </div>
      <div className="space-y-3 text-foreground/90 leading-relaxed">
        {article.content}
      </div>
    </div>
  );
}

function HelpArticleLink({ id, title, description }: { id: string; title: string; description: string }) {
  const { openHelp } = useHelpSidebar();
  return (
    <button
      type="button"
      onClick={() => openHelp(id)}
      className="w-full text-left rounded-lg border p-3 hover:bg-hover-highlight transition-colors"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

// ── Article registry ────────────────────────────────────────────────────────

const HELP_ARTICLES: Record<string, { title: string; description: string; content: React.ReactNode }> = {
  "content-library": {
    title: "Content Library",
    description: "Save and reuse your best hooks, CTAs, closings, and snippets",
    content: (
      <>
        <p>The Content Library lets you save pieces of content you use frequently and insert them into any post with one click.</p>
        <p><strong>Content types:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Hooks:</strong> Opening lines that stop readers from scrolling</li>
          <li><strong>CTAs:</strong> Phrases that encourage engagement</li>
          <li><strong>Closings:</strong> Lines that wrap up your post with impact</li>
          <li><strong>Snippets:</strong> Reusable text blocks you use often</li>
        </ul>
        <p><strong>How to use:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Save from the editor: select text, click Format, then "Save to Library"</li>
          <li>Save from the Library page: click "Add to Library"</li>
          <li>Insert into a post: click "Insert from Library" in the editor</li>
        </ol>
      </>
    ),
  },
  "templates": {
    title: "Post Templates",
    description: "Use built-in templates or save your own post structures",
    content: (
      <>
        <p>Templates give you a head start on common post formats so you don&apos;t have to start from a blank page.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>When creating a new post, use the template picker to choose a built-in format</li>
          <li>Replace the placeholder text with your own content</li>
          <li>Save your own templates using "Save as Template" in the editor</li>
        </ol>
        <p className="text-xs text-muted-foreground">Built-in templates: Story Arc, Hot Take, How-To Guide, Listicle, Question Post, Framework, Lessons Learned, Myth Buster</p>
      </>
    ),
  },
  "ai-assistant": {
    title: "AI Assistant",
    description: "Draft, refine, and improve posts with AI-powered help",
    content: (
      <>
        <p>The AI Assistant uses your Creator Profile to generate content that matches your voice and style.</p>
        <p><strong>Quick suggestions:</strong> Use the chips (Add a hook, Make it shorter, etc.) for instant improvements.</p>
        <p><strong>Free-form chat:</strong> Type any instruction for more specific requests.</p>
        <p><strong>Apply to Editor:</strong> Click this button on any AI response to replace your editor content with the AI draft. Your previous version is auto-saved.</p>
      </>
    ),
  },
  "hook-analysis": {
    title: "Hook Analysis",
    description: "Get AI feedback on your post's opening lines",
    content: (
      <>
        <p>The hook is the first ~210 characters of your post, visible before LinkedIn&apos;s "see more" link. It determines whether readers stop scrolling.</p>
        <p>Click "Analyze Hook" in the Format menu to get:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A strength score (strong, moderate, or weak)</li>
          <li>The technique your hook uses (curiosity gap, bold claim, etc.)</li>
          <li>Specific feedback and improvement suggestions</li>
        </ul>
      </>
    ),
  },
  "scheduling": {
    title: "Scheduling & Calendar",
    description: "Schedule posts for automatic publishing",
    content: (
      <>
        <p>When you schedule a post, it is <strong>not</strong> published immediately. PostPilot will automatically publish it to LinkedIn at the scheduled date and time.</p>
        <p><strong>To schedule:</strong> Click "Schedule Post" in the Actions menu and pick a date and time.</p>
        <p><strong>To reschedule:</strong> Open the post and click "Schedule Post" again to pick a new time.</p>
        <p><strong>Calendar views:</strong> Use Month, Week, or Day views to see your scheduled content at a glance.</p>
      </>
    ),
  },
  "idea-generation": {
    title: "How Ideas Work",
    description: "Generate, curate, and develop ideas into posts",
    content: (
      <>
        <p>The Idea Bank is your brainstorming hub. The workflow is:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Generate:</strong> Click "Generate Ideas" to get AI-powered content suggestions based on your expertise</li>
          <li><strong>Filter & Organize:</strong> Review ideas by temperature (Hot/Warm/Cold), edit, or archive</li>
          <li><strong>Develop:</strong> Click "Develop" on any idea to turn it into a post draft with AI assistance</li>
        </ol>
      </>
    ),
  },
  "content-pillars": {
    title: "Content Pillars",
    description: "The key themes you post about",
    content: (
      <>
        <p>Content pillars are the recurring themes that define your professional content. A balanced mix keeps your audience engaged and positions you as a well-rounded thought leader.</p>
        <p>The Content Pillar Balance chart on your dashboard shows how your posts are distributed across your pillars, highlighting any that need more attention.</p>
        <p>You can set up your content pillars in your Creator Profile under Voice & Style.</p>
      </>
    ),
  },
};
