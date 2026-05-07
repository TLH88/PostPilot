/**
 * Centralized tooltip content map for all interactive elements across the app.
 * Organized by page/section for easy maintenance.
 * Optional `helpUrl` enables a "Learn more" link in the tooltip.
 */

export interface TooltipEntry {
  text: string;
  helpUrl?: string;
}

// ─── Post Card Actions ─────────────────────────────────────────────────────

export const POST_ACTION_TOOLTIPS = {
  moveToReview: { text: "Submit this post for review before publishing" },
  manuallyPosted: { text: "Mark this post as already published to LinkedIn outside of PostPilot" },
  reschedule: { text: "Change the scheduled publish date and time for this post" },
  postNow: { text: "Publish this post to LinkedIn immediately" },
  openInEditor: { text: "Open this post in the full editor to make changes" },
  archive: { text: "Remove this post from your active workflow. You can restore it later." },
  restore: { text: "Move this archived post back to draft status" },
  delete: { text: "Permanently delete this post and all its versions. This cannot be undone." },
} satisfies Record<string, TooltipEntry>;

// ─── Post Editor ────────────────────────────────────────────────────────────

export const EDITOR_TOOLTIPS = {
  // Formatting toolbar
  bulletPoint: { text: "Bullet list" },
  numberedList: { text: "Numbered list" },
  suggestHashtags: { text: "Suggest hashtags" },
  aiEnhance: { text: "AI Enhance" },
  saveToLibrary: { text: "Save to Library", helpUrl: "/help#content-library" },
  emojiPicker: { text: "Insert emoji" },
  // Version management
  saveVersion: { text: "Save the current state as a named version you can return to later" },
  saveAsNewPost: { text: "Create a separate standalone post from the current content" },
  // saveAsTemplate suppressed until POST_TEMPLATES_ENABLED flips post-GTM.
  // Surface that consumes this is gated by the same flag in posts/[id]/page.tsx
  // — no code path currently reaches this entry, but keeping the (unused)
  // tooltip text out of the bundle keeps the marketing surface consistent.
  // AI chat
  showAI: { text: "Show Post Pilot AI", helpUrl: "/help#ai-assistant" },
  hideAI: { text: "Hide Post Pilot AI" },
  applyToEditor: { text: "Replace the editor content with this AI-generated draft" },
  // Status actions
  schedule: { text: "Set a date and time for this post to be automatically published to LinkedIn", helpUrl: "/help#scheduling" },
  publishToLinkedIn: { text: "Send this post to LinkedIn right now" },
  preview: { text: "See how this post will look on LinkedIn before publishing" },
} satisfies Record<string, TooltipEntry>;

// ─── Ideas Page ─────────────────────────────────────────────────────────────

export const IDEAS_TOOLTIPS = {
  generateIdeas: { text: "Use AI to brainstorm content ideas based on your expertise and content pillars", helpUrl: "/help#idea-generation" },
  develop: { text: "Turn this idea into a post draft. The AI will create an initial draft based on this idea." },
} satisfies Record<string, TooltipEntry>;

// ─── Calendar Page ──────────────────────────────────────────────────────────

export const CALENDAR_TOOLTIPS = {
  monthView: { text: "See all scheduled posts for the entire month at a glance" },
  weekView: { text: "See scheduled posts for the current week with more detail" },
  dayView: { text: "See all posts scheduled for a specific day with hourly timeslots" },
} satisfies Record<string, TooltipEntry>;

// ─── Content Library ────────────────────────────────────────────────────────

export const LIBRARY_TOOLTIPS = {
  filterHook: { text: "Opening lines designed to stop readers from scrolling and make them click 'see more'" },
  filterCTA: { text: "Call-to-action phrases that encourage readers to engage, comment, or take a next step" },
  filterClosing: { text: "Closing lines that wrap up your post with impact and leave a lasting impression" },
  filterSnippet: { text: "Reusable text blocks: quotes, stats, transitions, or any content you use often" },
} satisfies Record<string, TooltipEntry>;

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const DASHBOARD_TOOLTIPS = {
  contentBalance: { text: "Content pillars are the key themes you post about. A balanced mix keeps your audience engaged and positions you as a well-rounded thought leader. Click any category to see the individual topics inside it.", helpUrl: "/help#content-pillars" },
  recentDrafts: { text: "Posts you've started but haven't scheduled or published yet. Click any card to pick up where you left off." },
  recentScheduled: { text: "Posts you've queued up to publish automatically at a future date and time." },
  recentlyPosted: { text: "Your most recent posts that have gone live on LinkedIn. Click one to review its analytics." },
  recentIdeas: { text: "The latest ideas saved in your Idea Bank — including brainstorms we've generated and anything you've captured manually. Click one to start developing it into a post." },
} satisfies Record<string, TooltipEntry>;
