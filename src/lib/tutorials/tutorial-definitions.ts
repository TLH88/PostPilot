/**
 * Tutorial definitions based on docs/GUIDED-TOURS-REQUIREMENTS.md
 *
 * Two categories:
 * - "overview": Page-level orientation (where things are, what they do)
 * - "howto": Step-by-step interactive walkthroughs
 */

import type { TutorialDefinition } from "./tutorial-engine";

// ── Overview Tours ──────────────────────────────────────────────────────────

const OVERVIEW_APP: TutorialDefinition = {
  id: "overview-app",
  name: "Full Application Overview",
  description: "Tour the main navigation and workspace layout",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "🧭",
      title: "Your Navigation",
      content: "This sidebar is your main menu. It takes you to every part of PostPilot: your Dashboard, Idea Bank, Posts, Library, Calendar, and Analytics.",
      selector: "#tour-sidebar-nav",
      side: "right",
      helpArticle: "getting-started",
    },
    {
      icon: "⚙️",
      title: "Settings, Help & Profile",
      content: "Down here you'll find your Settings (AI provider, LinkedIn connection), Help Center (guides and tutorials), and your Profile (expertise, voice, and subscription).",
      selector: "#tour-sidebar-settings",
      side: "right",
    },
    {
      icon: "🎉",
      title: "Your Workspace",
      content: "This is where all the action happens. Each page has its own tools and features. Hover any button for a tooltip explaining what it does. Check out the detailed tours to learn more!",
      selector: "#tour-quick-actions",
      side: "bottom",
      helpArticle: "getting-started",
    },
  ],
  relatedTutorials: ["overview-dashboard", "overview-ideas", "overview-posts", "overview-calendar", "overview-system"],
};

const OVERVIEW_DASHBOARD: TutorialDefinition = {
  id: "overview-dashboard",
  name: "Dashboard Overview",
  description: "Metrics, quick actions, drafts, usage, and content balance",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "📊",
      title: "Your Content Stats",
      content: "These cards show your content numbers at a glance: total posts, scheduled posts, and published posts. They update automatically as you work.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
      route: "/dashboard",
    },
    {
      icon: "🚀",
      title: "Quick Actions",
      content: "Your starting points. Generate Ideas opens the AI brainstorming tool. Start New Post creates a blank post. View Calendar shows your publishing schedule.",
      selector: "#tour-quick-actions",
      side: "bottom",
    },
    {
      icon: "📝",
      title: "Recent Drafts",
      content: "Your latest draft posts appear here for quick access. Click any draft to jump straight into editing it.",
      selector: "#tour-recent-drafts",
      side: "top",
    },
    {
      icon: "📈",
      title: "Monthly Usage",
      content: "Track how much of your monthly plan you've used: posts created, brainstorms, AI messages, and scheduled posts. This resets each month.",
      selector: "#tour-usage-summary",
      side: "left",
    },
    {
      icon: "🎉",
      title: "That's Your Dashboard!",
      content: "Ready to create some content? Try the Idea Generation tutorial to get started, or explore on your own.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
      helpArticle: "getting-started",
    },
  ],
  relatedTutorials: ["howto-idea-generation"],
  relatedArticles: ["getting-started"],
};

const OVERVIEW_IDEAS: TutorialDefinition = {
  id: "overview-ideas",
  name: "Idea Bank Overview",
  description: "Process flow, idea generator, filters, and idea cards",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "🔄",
      title: "The Idea Workflow",
      content: "PostPilot follows a simple 3-step process: Generate ideas with AI, filter and organize your favorites, then develop the best ones into LinkedIn posts.",
      selector: "#tour-idea-process-flow",
      side: "bottom",
      route: "/ideas",
      helpArticle: "idea-generation",
    },
    {
      icon: "✨",
      title: "AI Idea Generator",
      content: "Click this to start a new brainstorming session. The AI uses your expertise, content pillars, and audience to suggest relevant content ideas.",
      selector: "#tour-generate-ideas-btn",
      side: "bottom",
    },
    {
      icon: "🔍",
      title: "Filter & Search",
      content: "Use temperature filters to sort by urgency: Hot (trending now), Warm (solid evergreen), Cold (niche deep-dives). Use status filters to see Open or Closed ideas.",
      selector: "#tour-idea-filters",
      side: "bottom",
    },
    {
      icon: "💡",
      title: "Your Idea Cards",
      content: "Each idea card shows the title, description, temperature badge, and content pillar. Use the buttons to Edit, Archive, or Develop an idea into a full post.",
      selector: "#tour-idea-card",
      side: "top",
    },
    {
      icon: "🎉",
      title: "That's the Idea Bank!",
      content: "Want to try generating your first ideas? Check out the step-by-step Idea Generation tutorial.",
      selector: "#tour-idea-process-flow",
      side: "bottom",
      helpArticle: "idea-generation",
    },
  ],
  relatedTutorials: ["howto-idea-generation"],
  relatedArticles: ["idea-generation"],
};

const OVERVIEW_POSTS: TutorialDefinition = {
  id: "overview-posts",
  name: "Posts Page Overview",
  description: "Metrics, filters, card actions, and new post options",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "📊",
      title: "Post Metrics",
      content: "These cards give you a quick count of your total posts, how many are scheduled, and how many have been published to LinkedIn.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
      route: "/posts",
    },
    {
      icon: "🔍",
      title: "Post Filters",
      content: "Use these tabs to filter your posts by status. 'In Work' shows drafts and scheduled posts. 'Complete' shows published and archived posts. You can also filter by individual status.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
    },
    {
      icon: "⚡",
      title: "Card Actions",
      content: "Each post card has an Actions dropdown. From here you can: Post to LinkedIn, Schedule for later, mark as Manually Posted, Archive, or Delete.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
      helpArticle: "post-actions",
    },
    {
      icon: "🎉",
      title: "That's the Posts Page!",
      content: "Ready to write? Check out the Post Creation tutorial for a complete walkthrough of the editor.",
      selector: "#tour-dashboard-metrics",
      side: "bottom",
    },
  ],
  relatedTutorials: ["howto-post-creation"],
  relatedArticles: ["post-actions"],
};

const OVERVIEW_CALENDAR: TutorialDefinition = {
  id: "overview-calendar",
  name: "Calendar Page Overview",
  description: "Calendar views, scheduled posts, and quick actions",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "📅",
      title: "Your Content Calendar",
      content: "This calendar shows all your scheduled posts. Each colored dot or card represents a post waiting to be published at its scheduled time.",
      selector: "#tour-calendar-views",
      side: "bottom",
      route: "/calendar",
    },
    {
      icon: "👁️",
      title: "Calendar Views",
      content: "Switch between Month view (big picture), Week view (more detail with images), and Day view (hourly timeslots). Click any date to drill into that day.",
      selector: "#tour-calendar-views",
      side: "bottom",
    },
    {
      icon: "⏰",
      title: "Upcoming Posts",
      content: "Your next scheduled posts are listed here, sorted by date. Each card shows the post title, scheduled publish time, and status.",
      selector: "#tour-upcoming-posts",
      side: "left",
      helpArticle: "scheduling",
    },
    {
      icon: "🎉",
      title: "That's the Calendar!",
      content: "Need to manage your schedule? Check out the Scheduled Post Management tutorial.",
      selector: "#tour-calendar-views",
      side: "bottom",
    },
  ],
  relatedTutorials: ["howto-scheduled-posts"],
  relatedArticles: ["scheduling"],
};

const OVERVIEW_SYSTEM: TutorialDefinition = {
  id: "overview-system",
  name: "System Management Overview",
  description: "Settings, Help Center, and Profile",
  mode: "interactive",
  category: "overview",
  steps: [
    {
      icon: "⚙️",
      title: "Settings",
      content: "Settings is where you configure your AI provider and API key, connect your LinkedIn account, manage workspace settings, and choose your app theme (light or dark).",
      selector: "#tour-sidebar-settings",
      side: "right",
    },
    {
      icon: "❓",
      title: "Help Center",
      content: "The Help Center has detailed guides for every feature, step-by-step tutorials, and the ability to restart any guided tour. Help articles also appear in a slide-out panel when you're working in other areas.",
      selector: "#tour-sidebar-settings",
      side: "right",
    },
    {
      icon: "🎉",
      title: "Your Profile",
      content: "Your Profile stores your expertise, writing voice, content pillars, and subscription plan. The AI uses this information to generate content that sounds like you, not a robot.",
      selector: "#tour-sidebar-settings",
      side: "right",
    },
  ],
  relatedTutorials: ["howto-settings", "howto-help-center", "howto-profile"],
};

// ── How-To Tutorials ────────────────────────────────────────────────────────

const HOWTO_IDEA_GENERATION: TutorialDefinition = {
  id: "howto-idea-generation",
  name: "Idea Generation",
  description: "From brainstorm to initial draft",
  mode: "interactive",
  category: "howto",
  steps: [
    {
      icon: "💡",
      title: "Start Brainstorming",
      content: "Let's generate some content ideas! Click the 'Generate Ideas' button to open the AI Idea Generator.",
      selector: "#tour-generate-ideas",
      side: "bottom",
      route: "/dashboard",
      waitFor: "click",
      clickTarget: "#tour-generate-ideas",
    },
    {
      icon: "✨",
      title: "Open the Idea Generator",
      content: "Click 'Generate Ideas' to open the brainstorming dialog. You'll choose a content pillar and topic for the AI to work with.",
      selector: "#tour-generate-ideas-btn",
      side: "bottom",
      route: "/ideas",
      waitFor: "click",
      clickTarget: "#tour-generate-ideas-btn",
    },
    {
      icon: "🎯",
      title: "Configure & Generate",
      content: "Select a content pillar, enter a topic, and click Generate. The AI will brainstorm several ideas based on your expertise. This step is yours to explore!",
      selector: "#tour-generate-ideas-btn",
      side: "bottom",
      waitFor: "manual",
    },
    {
      icon: "🌡️",
      title: "Review Your Ideas",
      content: "Here are your new ideas! Each one has a temperature badge: Hot (timely), Warm (evergreen), or Cold (niche). Read through them and pick one you like.",
      selector: "#tour-idea-card",
      side: "top",
      waitFor: "manual",
    },
    {
      icon: "🚀",
      title: "Develop into a Post",
      content: "Found one you like? Click 'Develop' to turn it into a LinkedIn post. The AI will automatically create an initial draft using your writing voice!",
      selector: "#tour-idea-card",
      side: "top",
      waitFor: "manual",
      helpArticle: "idea-generation",
    },
  ],
  relatedTutorials: ["howto-post-creation"],
  relatedArticles: ["idea-generation", "ai-assistant"],
};

const HOWTO_POST_CREATION: TutorialDefinition = {
  id: "howto-post-creation",
  name: "Post Creation",
  description: "From draft to published on LinkedIn",
  mode: "interactive",
  category: "howto",
  steps: [
    {
      icon: "📊",
      title: "Your Post's Journey",
      content: "This progress bar shows where your post is in the workflow: Draft, Scheduled, or Published. Timestamps appear as you move through each stage.",
      selector: "#tour-progress-bar",
      side: "bottom",
      helpArticle: "scheduling",
    },
    {
      icon: "📝",
      title: "Write Your Content",
      content: "This is your writing space. Type or edit your post here. Everything auto-saves as you type (look for the cloud icon). LinkedIn allows up to 3,000 characters.",
      selector: "#tour-editor-content",
      side: "top",
    },
    {
      icon: "😀",
      title: "Add Emojis",
      content: "Click the emoji picker to browse and insert emojis into your post. Emojis help your post stand out in the LinkedIn feed and add personality.",
      selector: "#tour-formatting-toolbar",
      side: "bottom",
    },
    {
      icon: "🎨",
      title: "Formatting Tools",
      content: "The Format menu gives you line breaks (for spacing), bullet points (for lists), Hook Analysis (AI feedback on your opening lines), Save to Library (save great lines for reuse), and Copy Post (clipboard).",
      selector: "#tour-formatting-toolbar",
      side: "bottom",
      helpArticle: "content-library",
    },
    {
      icon: "📚",
      title: "Insert Library Content",
      content: "Click here to insert saved hooks, CTAs, closings, or snippets from your Content Library. This is a huge time-saver once you've built up a collection of your best content pieces.",
      selector: "#tour-formatting-toolbar",
      side: "bottom",
      helpArticle: "content-library",
    },
    {
      icon: "🤖",
      title: "Your AI Writing Partner",
      content: "Open the AI Assistant panel. It knows your voice, style, and everything about your current post. Try quick suggestions like 'Add a hook', 'Make it shorter', or type your own request.",
      selector: "#tour-ai-panel",
      side: "left",
      helpArticle: "ai-assistant",
    },
    {
      icon: "🖼️",
      title: "Add an Image",
      content: "Upload your own image or click 'Generate with AI' to create one. Choose the format, art style, and customize the prompt. Every image is saved as a version so you can switch between them.",
      selector: "#tour-image-section",
      side: "top",
      helpArticle: "post-images",
    },
    {
      icon: "#️⃣",
      title: "Add Hashtags",
      content: "Click 'Suggest' to let AI recommend relevant hashtags, or type your own. Hashtags help your post reach people beyond your network. LinkedIn recommends 3-5 per post.",
      selector: "#tour-hashtags",
      side: "top",
    },
    {
      icon: "💾",
      title: "Save & Manage Versions",
      content: "Save different versions of your post to explore multiple approaches to the same topic. You can also save the current post as a reusable template for future content.",
      selector: "#tour-actions-menu",
      side: "bottom",
    },
    {
      icon: "🚀",
      title: "Publish Your Post",
      content: "When you're ready, use the Actions menu. 'Post to LinkedIn' opens a preview first (you'll confirm before it goes live). 'Schedule Post' lets you pick a future date and time. You're always in control.",
      selector: "#tour-actions-menu",
      side: "bottom",
      helpArticle: "post-actions",
    },
  ],
  relatedTutorials: ["howto-scheduled-posts"],
  relatedArticles: ["post-actions", "content-library", "ai-assistant"],
};

const HOWTO_SCHEDULED_POSTS: TutorialDefinition = {
  id: "howto-scheduled-posts",
  name: "Scheduled Post Management",
  description: "Using the calendar to manage your publishing schedule",
  mode: "interactive",
  category: "howto",
  steps: [
    {
      icon: "📅",
      title: "Your Publishing Schedule",
      content: "The calendar shows all your scheduled posts on the dates they'll be published. Each post appears as a colored card on its scheduled day.",
      selector: "#tour-calendar-views",
      side: "bottom",
      route: "/calendar",
    },
    {
      icon: "👁️",
      title: "Change Your View",
      content: "Switch views to see your schedule differently. Month view shows the big picture. Week view shows more detail with post images. Day view shows hourly timeslots.",
      selector: "#tour-calendar-views",
      side: "bottom",
    },
    {
      icon: "👆",
      title: "Hover for Details",
      content: "Hover over any post on the calendar to see a quick preview: the title, first few lines of content, scheduled time, and content pillar.",
      selector: "#tour-calendar-views",
      side: "bottom",
    },
    {
      icon: "📋",
      title: "Upcoming Posts",
      content: "This panel lists your next scheduled posts in order. It's the quickest way to see what's coming up and take action.",
      selector: "#tour-upcoming-posts",
      side: "left",
    },
    {
      icon: "🔄",
      title: "Reschedule a Post",
      content: "Need to change when a post publishes? Click 'Reschedule' to pick a new date and time. The post stays exactly as it is, just the timing changes.",
      selector: "#tour-upcoming-posts",
      side: "left",
    },
    {
      icon: "🎉",
      title: "Publish Immediately",
      content: "Don't want to wait? Click 'Post Now' to publish a scheduled post to LinkedIn right away. You'll see a preview before it goes live.",
      selector: "#tour-upcoming-posts",
      side: "left",
      helpArticle: "scheduling",
    },
  ],
  relatedArticles: ["scheduling"],
};

// ── Registry ────────────────────────────────────────────────────────────────

export const TUTORIAL_REGISTRY: Record<string, TutorialDefinition> = {
  "overview-app": OVERVIEW_APP,
  "overview-dashboard": OVERVIEW_DASHBOARD,
  "overview-ideas": OVERVIEW_IDEAS,
  "overview-posts": OVERVIEW_POSTS,
  "overview-calendar": OVERVIEW_CALENDAR,
  "overview-system": OVERVIEW_SYSTEM,
  "howto-idea-generation": HOWTO_IDEA_GENERATION,
  "howto-post-creation": HOWTO_POST_CREATION,
  "howto-scheduled-posts": HOWTO_SCHEDULED_POSTS,
};
