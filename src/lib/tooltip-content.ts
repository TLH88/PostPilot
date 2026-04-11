/**
 * Centralized tooltip content map for all interactive elements across the app.
 * Organized by page/section for easy maintenance.
 * Optional `helpUrl` enables a "Learn more" link in the tooltip.
 */

export interface TooltipEntry {
  text: string;
  helpUrl?: string;
}

// ─── Posts Page ─────────────────────────────────────────────────────────────

export const POSTS_TOOLTIPS = {
  newPost: { text: "Create a new blank post and open it in the editor" },
  filterInWork: { text: "Posts you're currently working on: drafts, in review, and scheduled" },
  filterComplete: { text: "Posts that have been published or archived" },
  filterDraft: { text: "Posts still being written or edited" },
  filterReview: { text: "Posts submitted for team review before publishing" },
  filterScheduled: { text: "Posts queued to publish automatically at a future date and time" },
  filterPastDue: { text: "Scheduled posts that missed their publish window" },
  filterPosted: { text: "Posts successfully published to LinkedIn" },
  filterArchived: { text: "Posts removed from your active workflow" },
  metricTotal: { text: "Total number of posts across all statuses" },
  metricScheduled: { text: "Posts queued for automatic LinkedIn publishing" },
  metricReview: { text: "Posts awaiting team review" },
  metricPublished: { text: "Posts successfully published to LinkedIn" },
} satisfies Record<string, TooltipEntry>;

// ─── Post Card Actions ─────────────────────────────────────────────────────

export const POST_ACTION_TOOLTIPS = {
  moveToReview: { text: "Submit this post for team review before publishing. Available for Team and Enterprise plans." },
  backToDraft: { text: "Revert this post to draft status for further editing" },
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
  lineBreak: { text: "Insert a line break for visual spacing between paragraphs" },
  bulletPoint: { text: "Insert a bullet point. Press Enter to continue the list, Enter twice to exit." },
  copyPost: { text: "Copy the post content and hashtags to your clipboard for pasting into LinkedIn" },
  saveToLibrary: { text: "Save a section of this post to your Content Library for reuse", helpUrl: "/help#content-library" },
  insertFromLibrary: { text: "Insert saved hooks, CTAs, or closings from your Content Library", helpUrl: "/help#content-library" },
  emojiPicker: { text: "Insert an emoji into your post" },
  analyzeHook: { text: "Get AI feedback on your post's opening lines (the first ~210 characters visible before 'see more')", helpUrl: "/help#hook-analysis" },
  // Version management
  saveVersion: { text: "Save the current state as a named version you can return to later" },
  saveAsNewPost: { text: "Create a separate standalone post from the current content" },
  saveAsTemplate: { text: "Save this post's structure as a reusable template", helpUrl: "/help#templates" },
  // AI chat
  showAI: { text: "Open the AI Assistant panel to get help drafting, refining, or improving your post", helpUrl: "/help#ai-assistant" },
  hideAI: { text: "Close the AI Assistant panel" },
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
  archiveIdea: { text: "Remove this idea from your active bank. You can filter to see archived ideas." },
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
  usageCount: { text: "How many times you've inserted this item into a post" },
  addToLibrary: { text: "Save a new hook, CTA, closing, or snippet to your Content Library" },
} satisfies Record<string, TooltipEntry>;

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const DASHBOARD_TOOLTIPS = {
  totalPosts: { text: "Total posts you've created across all statuses" },
  postsThisMonth: { text: "Posts created during the current billing month" },
  scheduledPosts: { text: "Posts queued for automatic LinkedIn publishing" },
  contentBalance: { text: "Distribution of your posts across content pillars. A balanced mix keeps your audience engaged.", helpUrl: "/help#content-pillars" },
  generateIdeas: { text: "Open the AI Idea Generator to brainstorm new content ideas", helpUrl: "/help#idea-generation" },
} satisfies Record<string, TooltipEntry>;

// ─── Settings ───────────────────────────────────────────────────────────────

export const SETTINGS_TOOLTIPS = {
  subscriptionTier: { text: "Your current plan determines which features and usage limits are available to you" },
  aiProvider: { text: "The AI service powering your content generation. You can switch providers anytime." },
  aiModel: { text: "Different models offer different quality and speed tradeoffs. More capable models may cost more." },
  apiKey: { text: "Your personal API key from your AI provider. Keys are encrypted and never shared." },
  linkedinConnect: { text: "Connect your LinkedIn account to publish posts directly from PostPilot" },
  linkedinDisconnect: { text: "Remove the LinkedIn posting connection. You can reconnect anytime." },
  managedAI: { text: "Trial AI access provided by PostPilot. Add your own API key for uninterrupted access." },
} satisfies Record<string, TooltipEntry>;
