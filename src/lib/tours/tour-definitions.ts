/**
 * Tour step definitions for PostPilot guided onboarding.
 *
 * Each step uses element IDs as selectors (e.g., "#tour-dashboard-metrics").
 * The `helpArticle` field links to the help sidebar article for "Need help?" links.
 *
 * Three progressive tours:
 * 1. "welcome" - Dashboard orientation after onboarding (5 steps)
 * 2. "idea-to-post" - Idea Bank workflow (4 steps)
 * 3. "post-editor" - Post editor features (6 steps)
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
      {
        icon: "🧭",
        title: "Welcome to PostPilot!",
        content: "This is your navigation sidebar. Use it to move between pages: Ideas, Posts, Library, Calendar, and more. Each page has tooltips on buttons to help you along.",
        selector: "#tour-sidebar-nav",
        side: "right",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "getting-started",
      },
      {
        icon: "⚙️",
        title: "Settings, Help & Profile",
        content: "Down here you'll find Settings (AI provider, LinkedIn connection, theme), Help Center (guides and tutorials), and your Profile (expertise, voice, and subscription plan).",
        selector: "#tour-sidebar-settings",
        side: "right",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "💡",
        title: "Start with Ideas",
        content: "Click here to brainstorm content ideas with AI. It uses your expertise and content pillars to suggest topics tailored to your audience.",
        selector: "#tour-generate-ideas",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "idea-generation",
      },
      {
        icon: "✍️",
        title: "Create a Post",
        content: "You can also create a post from scratch without starting from an idea. The AI Assistant will help you draft and refine your content.",
        selector: "#tour-new-post",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "post-actions",
      },
      {
        icon: "📅",
        title: "View Your Calendar",
        content: "See all your scheduled posts on a visual calendar. Plan your publishing schedule and make sure you're posting consistently.",
        selector: "#tour-view-calendar",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "scheduling",
      },
      {
        icon: "📝",
        title: "Recent Drafts",
        content: "Your latest drafts appear here for quick access. Click any draft to jump straight into editing it.",
        selector: "#tour-recent-drafts",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "📊",
        title: "Monthly Usage",
        content: "Track how much of your monthly plan you've used: posts created, brainstorms, AI messages, and scheduled posts. Upgrade anytime if you need more.",
        selector: "#tour-usage-summary",
        side: "left",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "🎉",
        title: "Your Dashboard at a Glance",
        content: "These cards show your content stats: total posts, scheduled, and published. You're all set! Explore at your own pace, and hover any button for a helpful tooltip.",
        selector: "#tour-dashboard-metrics",
        side: "bottom",
        showControls: true,
        pointerPadding: 12,
        pointerRadius: 16,
      },
    ],
  },
  {
    tour: "idea-to-post",
    steps: [
      {
        icon: "🔄",
        title: "The Idea Workflow",
        content: "Here's how it works: Generate ideas with AI, filter and organize your favorites, then develop the best ones into polished posts.",
        selector: "#tour-idea-process-flow",
        side: "bottom",
        showControls: true,
        pointerPadding: 12,
        pointerRadius: 16,
        helpArticle: "idea-generation",
      },
      {
        icon: "✨",
        title: "Generate Ideas",
        content: "Click here to get AI-generated content ideas. Pick a content pillar and enter a topic to get started. The AI will suggest ideas based on your expertise.",
        selector: "#tour-generate-ideas-btn",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "idea-generation",
      },
      {
        icon: "🌡️",
        title: "Browse Your Ideas",
        content: "Each idea gets a temperature: Hot (trending topics), Warm (evergreen content), or Cold (niche deep-dives). Click \"Develop\" on any idea to turn it into a post. The AI will write a first draft for you!",
        selector: "#tour-idea-card",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "idea-generation",
      },
      {
        icon: "🎉",
        title: "That's the Idea Flow!",
        content: "When you develop an idea, you'll land in the post editor where another quick tour will show you the tools. Ready to brainstorm?",
        selector: "#tour-idea-process-flow",
        side: "bottom",
        showControls: true,
        pointerPadding: 12,
        pointerRadius: 16,
      },
    ],
  },
  {
    tour: "post-editor",
    steps: [
      {
        icon: "📊",
        title: "Track Your Progress",
        content: "This bar shows your post's journey from Draft to Scheduled to Published, with timestamps at each stage. It updates automatically as you work.",
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
        content: "This is your writing space. Use the Format menu above for line breaks, bullets, and to save your best lines to the Content Library for reuse later.",
        selector: "#tour-editor-content",
        side: "right",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "content-library",
      },
      {
        icon: "🤖",
        title: "Your AI Writing Partner",
        content: "Open the AI Assistant to get help. It knows your voice, style, and the full context of your post. Ask it to draft, refine, shorten, add a hook, or improve anything.",
        selector: "#tour-ai-panel",
        side: "left",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "ai-assistant",
      },
      {
        icon: "🚀",
        title: "Publish or Schedule",
        content: "All actions in one place. \"Post to LinkedIn\" opens a preview first (never posts without your confirmation). \"Schedule Post\" sets a future publish date. You're always in control.",
        selector: "#tour-actions-menu",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "post-actions",
      },
      {
        icon: "🖼️",
        title: "Add Images",
        content: "Upload your own image or generate one with AI. Every image is saved as a version, so you can switch between them anytime. Posts with images get more engagement!",
        selector: "#tour-image-section",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
        helpArticle: "post-images",
      },
      {
        icon: "🎉",
        title: "You're Ready to Create!",
        content: "That's everything you need. Hover any button for a tooltip, or click the help icon for detailed guides. Now go write something amazing!",
        selector: "#tour-progress-bar",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 16,
      },
    ],
  },
];
