/**
 * Tour step definitions for PostPilot guided onboarding.
 *
 * ONE end-to-end tour that walks users through the complete workflow:
 * Dashboard → Idea Generator → Idea Bank → Post Editor → Calendar → Publishing
 *
 * Uses Onborda's nextRoute/prevRoute for cross-page navigation.
 */

export interface TourStepDef {
  icon: string;
  title: string;
  content: string;
  selector: string;
  side: "top" | "bottom" | "left" | "right";
  showControls: boolean;
  pointerPadding: number;
  pointerRadius: number;
  helpArticle?: string;
  nextRoute?: string;
  prevRoute?: string;
}

export interface TourDef {
  tour: string;
  steps: TourStepDef[];
}

export const TOUR_DEFINITIONS: TourDef[] = [
  {
    tour: "welcome",
    steps: [
      // ─── DASHBOARD (Steps 1-3) ──────────────────────────────────────
      {
        icon: "👋",
        title: "Welcome to PostPilot!",
        content: "Let's walk through everything you need to create and publish great LinkedIn content. This tour takes about 2 minutes.",
        selector: "#tour-sidebar-nav",
        side: "right",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "getting-started",
      },
      {
        icon: "🚀",
        title: "Your Quick Actions",
        content: "These are your main starting points: Generate Ideas with AI, Start a New Post from scratch, or View your Calendar to see scheduled posts.",
        selector: "#tour-quick-actions",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: "💡",
        title: "Let's Generate Some Ideas",
        content: "The best way to start is by brainstorming. Click \"Generate Ideas\" to open the AI Idea Generator. Let's try it!",
        selector: "#tour-generate-ideas",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
        helpArticle: "idea-generation",
        nextRoute: "/ideas",
      },

      // ─── IDEAS PAGE (Steps 4-7) ─────────────────────────────────────
      {
        icon: "🔄",
        title: "The Idea Workflow",
        content: "Here's how it works: Generate ideas with AI, filter and organize your favorites, then develop the best ones into polished LinkedIn posts.",
        selector: "#tour-idea-process-flow",
        side: "bottom",
        showControls: true,
        pointerPadding: 12,
        pointerRadius: 16,
        helpArticle: "idea-generation",
        prevRoute: "/dashboard",
      },
      {
        icon: "✨",
        title: "Generate Ideas with AI",
        content: "Click this button to open the Idea Generator. Pick a content pillar, enter a topic, and the AI will brainstorm ideas based on your expertise and audience.",
        selector: "#tour-generate-ideas-btn",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "idea-generation",
      },
      {
        icon: "🔍",
        title: "Filter Your Ideas",
        content: "Use temperature filters (Hot = trending, Warm = evergreen, Cold = niche) and status filters (Open, Closed) to find the right ideas to work on.",
        selector: "#tour-idea-filters",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: "🌡️",
        title: "Develop an Idea into a Post",
        content: "When you find an idea you like, click \"Develop\" to turn it into a post. The AI will automatically write a first draft based on the idea's title and description!",
        selector: "#tour-idea-card",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "idea-generation",
      },

      // ─── POST EDITOR (Steps 8-14) ──────────────────────────────────
      {
        icon: "📊",
        title: "Track Your Progress",
        content: "This progress bar shows your post's journey: Draft, Scheduled, Published. Each step shows a timestamp so you can see the full timeline.",
        selector: "#tour-progress-bar",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 16,
        helpArticle: "scheduling",
      },
      {
        icon: "📝",
        title: "Write Your Post",
        content: "This is your writing space. Type your content here. It auto-saves as you type, so you never lose your work.",
        selector: "#tour-editor-content",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "🎨",
        title: "Format & Library Tools",
        content: "Use the emoji picker, Format menu (line breaks, bullets, hook analysis), and Insert from Library to add your saved hooks, CTAs, and closings.",
        selector: "#tour-formatting-toolbar",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "content-library",
      },
      {
        icon: "🤖",
        title: "Your AI Writing Partner",
        content: "Open the AI Assistant panel. It knows your voice, style, and the full context of your post. Ask it to draft, shorten, add a hook, or improve anything.",
        selector: "#tour-ai-panel",
        side: "left",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "ai-assistant",
      },
      {
        icon: "🖼️",
        title: "Add Images",
        content: "Upload your own image or generate one with AI. Every image is saved as a version so you can switch between them. Posts with images get more engagement!",
        selector: "#tour-image-section",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "post-images",
      },
      {
        icon: "#️⃣",
        title: "Add Hashtags",
        content: "Add hashtags to increase your post's reach. Click \"Suggest\" to let AI recommend relevant hashtags, or type your own.",
        selector: "#tour-hashtags",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "🚀",
        title: "Publish or Schedule",
        content: "Use the Actions menu to: Post to LinkedIn (opens a preview first), Schedule for a future date, or mark as Manually Posted. You're always in control.",
        selector: "#tour-actions-menu",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "post-actions",
        nextRoute: "/calendar",
      },

      // ─── CALENDAR (Steps 15-16) ─────────────────────────────────────
      {
        icon: "📅",
        title: "Your Content Calendar",
        content: "Switch between Month, Week, and Day views to see your scheduled posts. Hover any post for a quick preview.",
        selector: "#tour-calendar-views",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "scheduling",
      },
      {
        icon: "⏰",
        title: "Manage Upcoming Posts",
        content: "Your upcoming scheduled posts are listed here. Use the Reschedule button to change the date, or Post Now to publish immediately.",
        selector: "#tour-upcoming-posts",
        side: "left",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "scheduling",
      },

      // ─── FINISH (Step 17) ───────────────────────────────────────────
      {
        icon: "🎉",
        title: "You're Ready!",
        content: "That's the complete workflow! Generate ideas, develop posts, use AI to write, add images, schedule or publish. Hover any button for a tooltip, or click Help for detailed guides. Happy posting!",
        selector: "#tour-calendar-views",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
    ],
  },
];
