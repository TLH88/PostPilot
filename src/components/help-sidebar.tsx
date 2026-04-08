"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, X, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useTour } from "@/lib/tours/tour-provider";
import { TOUR_NAMES } from "@/lib/tours/tour-storage";
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

  const closeHelp = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <HelpSidebarContext.Provider value={{ openHelp }}>
      {children}
      <Sheet
        open={open}
        onOpenChange={(value) => {
          // Only allow programmatic open; ignore outside-click dismiss
          if (value) setOpen(true);
        }}
        modal={false}
      >
        <SheetContent side="right" className="flex w-full max-w-lg flex-col p-0" showCloseButton={false}>
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <HelpCircle className="size-4 text-primary" />
                Help Center
              </SheetTitle>
              <Button variant="ghost" size="icon-sm" onClick={closeHelp}>
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
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

        {/* Guided Tours */}
        <GuidedToursSection />

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

// ── Guided Tours Section ────────────────────────────────────────────────────

function GuidedToursSection() {
  const { startTour, resetTour } = useTour();
  const router = useRouter();

  function handleRestart() {
    resetTour(TOUR_NAMES.WELCOME);
    router.push("/dashboard");
    setTimeout(() => startTour(TOUR_NAMES.WELCOME), 1200);
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guided Tour</h4>
      <p className="text-xs text-muted-foreground">Walk through the complete PostPilot workflow step by step.</p>
      <div className="space-y-1.5">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-left hover:bg-hover-highlight transition-colors"
          >
            <Play className="size-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium">Full Product Walkthrough</p>
              <p className="text-[10px] text-muted-foreground">Dashboard, ideas, post editor, calendar, and publishing</p>
            </div>
          </button>
      </div>
    </div>
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
        <p>The AI Assistant uses your Creator Profile to generate content that matches your voice and style. It has full context of your current post including title, content, status, hashtags, and content pillar.</p>
        <p><strong>Auto-drafting:</strong> When you develop an idea from the Idea Bank, the AI automatically generates an initial draft for you.</p>
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
        <p><strong>To schedule:</strong> Click "Schedule Post" in the Actions menu and pick a date and time. You can also schedule from the publish preview dialog.</p>
        <p><strong>To reschedule:</strong> Open the post and click "Schedule Post" again, or use the Reschedule button on the Calendar page.</p>
        <p><strong>To revert:</strong> Select "Revert to Draft" from the Actions menu to unschedule a post.</p>
        <p><strong>Progress bar:</strong> The editor shows a progress bar tracking Draft, Scheduled, and Published stages with timestamps.</p>
        <p><strong>Calendar views:</strong> Month (hover for previews), Week (with images), and Day (hourly timeslots).</p>
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
  "post-images": {
    title: "Post Images",
    description: "Upload, generate, and manage images for your posts",
    content: (
      <>
        <p>Add images to your LinkedIn posts to increase engagement. You can upload your own or generate images with AI.</p>
        <p><strong>Upload:</strong> Click the upload button in the Post Image section of the editor to add your own image (JPG, PNG, GIF, or WebP, up to 10 MB).</p>
        <p><strong>Generate with AI:</strong> Click "Generate with AI" to create an image using your AI provider. Choose the format (landscape or square), art style, and customize the prompt.</p>
        <p><strong>Image history:</strong> Every uploaded and generated image is saved as a version. Use the thumbnail strip below the image to switch between previous images at any time.</p>
        <p><strong>In the preview dialog:</strong> You can also add or switch images right before publishing using the image selector in the publish preview.</p>
      </>
    ),
  },
  "post-actions": {
    title: "Post Actions & Workflow",
    description: "Understanding the Actions menu and post statuses",
    content: (
      <>
        <p>The <strong>Actions</strong> menu in the post editor provides all workflow actions in one place:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Post to LinkedIn</strong> - Opens a preview dialog before publishing (never posts without confirmation)</li>
          <li><strong>Schedule Post</strong> - Set a future date and time for automatic publishing</li>
          <li><strong>Manually Posted</strong> - Mark a post as published when you posted it outside PostPilot</li>
          <li><strong>View on LinkedIn</strong> - Open your published post on LinkedIn</li>
          <li><strong>Revert to Draft</strong> - Move a scheduled or posted post back to draft for editing</li>
          <li><strong>Archive / Delete</strong> - Remove posts from your active workflow</li>
        </ul>
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
