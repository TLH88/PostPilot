export const LINKEDIN = {
  MAX_POST_LENGTH: 3000,
  HOOK_VISIBLE_LENGTH: 210,
  MAX_HASHTAGS: 5,
} as const;

export const APP_NAME = "PostPilot";
export const APP_DESCRIPTION = "Your AI-powered LinkedIn content partner";

export const POST_STATUSES = {
  draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800" },
  review: { label: "In Review", color: "bg-blue-100 text-blue-800" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-800" },
  posted: { label: "Posted to LinkedIn", color: "bg-green-100 text-green-800" },
  past_due: { label: "Past Due", color: "bg-red-100 text-red-800" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-800" },
} as const;

export const IDEA_STATUSES = {
  captured: { label: "Captured", color: "bg-gray-100 text-gray-700" },
  developing: { label: "Developing", color: "bg-yellow-100 text-yellow-700" },
  converted: { label: "Converted", color: "bg-green-100 text-green-700" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500" },
} as const;

export const EXPERTISE_SUGGESTIONS = [
  "AI/ML",
  "Leadership",
  "SaaS",
  "Product Management",
  "Engineering",
  "Data Science",
  "Marketing",
  "Sales",
  "Finance",
  "Healthcare",
  "Education",
  "Startups",
  "Enterprise",
  "Cloud Computing",
  "Cybersecurity",
  "DevOps",
  "UX Design",
  "Remote Work",
  "Career Development",
  "Entrepreneurship",
] as const;

export const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Conversational" },
  { value: "thought-leader", label: "Thought Leader" },
  { value: "storyteller", label: "Storyteller" },
  { value: "educator", label: "Educator" },
  { value: "motivational", label: "Motivational" },
] as const;

export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const SAVE_STATUS_RESET_MS = 2000;
export const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/ideas", label: "Idea Bank", icon: "Lightbulb" },
  { href: "/posts", label: "Posts", icon: "FileText" },
  { href: "/library", label: "Library", icon: "BookOpen" },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
] as const;

// Best times to post on LinkedIn (based on engagement research)
// Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
export const SCHEDULING_SUGGESTIONS = [
  { day: 2, hour: 8,  label: "Tue 8:00 AM" },
  { day: 2, hour: 10, label: "Tue 10:00 AM" },
  { day: 3, hour: 8,  label: "Wed 8:00 AM" },
  { day: 3, hour: 12, label: "Wed 12:00 PM" },
  { day: 4, hour: 8,  label: "Thu 8:00 AM" },
  { day: 4, hour: 10, label: "Thu 10:00 AM" },
] as const;

// ── Subscription Tiers & Quota Limits ─────────────────────────────────────────
// -1 = unlimited
export type SubscriptionTier = "free" | "creator" | "professional" | "team" | "enterprise";
export type QuotaType = "posts" | "brainstorms" | "chat_messages" | "scheduled_posts";

export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  {
    label: string;
    price: string;
    limits: Record<QuotaType, number>;
  }
> = {
  free: {
    label: "Free",
    price: "$0/mo",
    limits: { posts: 3, brainstorms: 2, chat_messages: 20, scheduled_posts: 2 },
  },
  creator: {
    label: "Creator",
    price: "$19/mo",
    limits: { posts: -1, brainstorms: 15, chat_messages: 200, scheduled_posts: 15 },
  },
  professional: {
    label: "Professional",
    price: "$49/mo",
    limits: { posts: -1, brainstorms: -1, chat_messages: -1, scheduled_posts: -1 },
  },
  team: {
    label: "Team",
    price: "$99/mo + $5.99/user",
    limits: { posts: -1, brainstorms: -1, chat_messages: -1, scheduled_posts: -1 },
  },
  enterprise: {
    label: "Enterprise",
    price: "Custom",
    limits: { posts: -1, brainstorms: -1, chat_messages: -1, scheduled_posts: -1 },
  },
} as const;

// Map quota DB columns to QuotaType keys
export const QUOTA_COLUMN_MAP: Record<QuotaType, string> = {
  posts: "posts_created",
  brainstorms: "brainstorms_used",
  chat_messages: "chat_messages_used",
  scheduled_posts: "scheduled_posts",
} as const;

// ── Tier Feature Matrix (used by pricing page + feature gating) ────────────────
export const TIER_FEATURES = [
  { key: "posts", name: "Posts / month", free: "3", creator: "Unlimited", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "brainstorms", name: "Brainstorms / month", free: "2", creator: "15", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "chat_messages", name: "AI Chat Messages / month", free: "20", creator: "200", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "scheduling", name: "Post Scheduling", free: "2", creator: "15", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "versions", name: "Post Versions", free: "1", creator: "5", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "image_generation", name: "AI Image Generation", free: false, creator: "5 / month", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "analytics", name: "Manual Analytics", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "ad_free", name: "Ad-Free Experience", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "workspaces", name: "Team Workspaces", free: false, creator: false, professional: false, team: true, enterprise: true },
  { key: "team_members", name: "Team Members", free: false, creator: false, professional: false, team: "5–150", enterprise: "150+" },
  { key: "brand_onboarding", name: "Brand Onboarding", free: false, creator: false, professional: false, team: true, enterprise: true },
  { key: "content_library", name: "Content Library", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "hook_analysis", name: "Hook Analysis", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "templates", name: "Post Templates", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "calendar", name: "Content Calendar", free: "View only", creator: true, professional: true, team: true, enterprise: true },
  { key: "byok", name: "Bring Your Own AI Key (BYOK)", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "ai_models", name: "All AI Models", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "enhance", name: "Enhance & Hashtags", free: true, creator: true, professional: true, team: true, enterprise: true },
  { key: "support", name: "Support", free: "Community", creator: "Email", professional: "Priority", team: "Priority", enterprise: "Dedicated" },
] as const;

// Features that require a minimum tier (used by feature gating)
export const GATED_FEATURES: Record<string, SubscriptionTier> = {
  content_library: "creator",
  hook_analysis: "creator",
  templates: "creator",
  image_generation: "creator",
  analytics: "creator",
  byok_ai_keys: "professional",
  byok_image_keys: "professional",
  review_status: "team",
  workspaces: "team",
  brand_onboarding: "team",
} as const;

// ── Tier badge colors ─────────────────────────────────────────────────────────
export const TIER_BADGE_COLORS: Record<string, string> = {
  free: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  creator: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  professional: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  team: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
} as const;

export const CONTENT_LIBRARY_TYPES = {
  hook: { label: "Hook", color: "bg-orange-100 text-orange-700" },
  cta: { label: "CTA", color: "bg-blue-100 text-blue-700" },
  closing: { label: "Closing", color: "bg-green-100 text-green-700" },
  snippet: { label: "Snippet", color: "bg-purple-100 text-purple-700" },
} as const;
