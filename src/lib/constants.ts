export const LINKEDIN = {
  MAX_POST_LENGTH: 3000,
  HOOK_VISIBLE_LENGTH: 210,
  MAX_HASHTAGS: 5,
} as const;

export const APP_NAME = "PostPilot";
export const APP_DESCRIPTION = "Your AI-powered LinkedIn content partner";

// Pill and text colors are the reverse of the original pairing: the previously
// dark shade (e.g. yellow-800) is now the background and the previously light
// shade (yellow-100) is now the text. This keeps the hue strong enough to
// distinguish statuses at a glance in both light and dark modes.
export const POST_STATUSES = {
  draft: { label: "Draft", color: "bg-yellow-800 text-yellow-100" },
  review: { label: "In Review", color: "bg-blue-800 text-blue-100" },
  scheduled: { label: "Scheduled", color: "bg-purple-800 text-purple-100" },
  posted: { label: "Posted to LinkedIn", color: "bg-green-800 text-green-100" },
  past_due: { label: "Past Due", color: "bg-red-800 text-red-100" },
  archived: { label: "Archived", color: "bg-gray-800 text-gray-100" },
} as const;

export const PUBLISH_METHODS = {
  scheduled: { label: "Auto-Published", color: "bg-green-800 text-green-100" },
  direct: { label: "Direct Publish", color: "bg-blue-800 text-blue-100" },
  manual: { label: "Manually Posted", color: "bg-teal-800 text-teal-100" },
} as const;

export const IDEA_STATUSES = {
  captured: { label: "Captured", color: "bg-gray-100 text-gray-700" },
  developing: { label: "Developing", color: "bg-yellow-100 text-yellow-700" },
  converted: { label: "Converted", color: "bg-green-100 text-green-700" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500" },
} as const;

// User-assigned priority for triaging ideas. Deliberately distinct from the
// removed temperature feature: priority is user-set, reversible, and optional.
// "No priority" (null) is a valid default state.
export const IDEA_PRIORITIES = {
  high: {
    label: "High",
    color:
      "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/40",
    order: 3,
  },
  medium: {
    label: "Medium",
    color:
      "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-400/25 dark:text-amber-50 dark:border-amber-400/60",
    order: 2,
  },
  low: {
    label: "Low",
    color:
      "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/25 dark:text-slate-200 dark:border-slate-500/40",
    order: 1,
  },
} as const;

export type IdeaPriority = keyof typeof IDEA_PRIORITIES;

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

/**
 * Sidebar / mobile-nav items.
 *
 * `feature` (optional) — gating key from GATED_FEATURES. When set, the item is
 * filtered out of the rendered nav for users whose tier doesn't grant the
 * feature, OR when the master feature flag for that feature is off
 * (e.g. BP-098 hides workspaces-gated items globally). Items without `feature`
 * are visible to everyone.
 *
 * `hideWhenGated` — when true, omit the item entirely instead of rendering a
 * lock icon. Used for Team-tier items so they disappear when BP-098 flag is
 * off. Items that should always render (with a Lock icon for non-eligible
 * tiers) leave this false.
 */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/ideas", label: "Idea Bank", icon: "Lightbulb" },
  { href: "/posts", label: "Posts", icon: "FileText" },
  { href: "/library", label: "Library", icon: "BookOpen", feature: "content_library", hideWhenGated: false },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3", feature: "analytics", hideWhenGated: false },
  { href: "/activity", label: "Activity", icon: "Activity", feature: "workspaces", hideWhenGated: true },
  { href: "/workspace/reviews", label: "Reviews", icon: "CheckSquare", feature: "workspaces", hideWhenGated: true },
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
    // Display label only — the internal tier key stays "creator" so Stripe
    // price lookups, DB values, and feature-gate checks keep working.
    // Full rename (internal key + table) tracked in BP-114.
    label: "Personal",
    price: "$20/mo",
    limits: { posts: -1, brainstorms: 15, chat_messages: 200, scheduled_posts: 15 },
    // NOTE: these `limits` values are the pre-v2 enforcement numbers. BP-117
    // will migrate them to the v2-approved quotas (30/20/200/30 +
    // image_generation column). This BP-116 edit touches display only.
  },
  professional: {
    label: "Professional",
    price: "$50/mo",
    limits: { posts: -1, brainstorms: -1, chat_messages: -1, scheduled_posts: -1 },
    // NOTE: same as creator above — BP-117 will flip these to 100/200/500/-1
    // with BYOK unlocking unlimited.
  },
  team: {
    label: "Team",
    price: "$100/mo + $6/user",
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
// NOTE: Updated 2026-04-24 for Subscription Model v2 (BP-116). Display values
// reflect the v2-approved quotas. Quota ENFORCEMENT numbers in
// `SUBSCRIPTION_TIERS.limits` still carry the pre-v2 values — BP-117 will
// migrate the limits to match this table.
export const TIER_FEATURES = [
  { key: "posts", name: "Posts / mo", free: "3", creator: "30", professional: "100", team: "Unlimited", enterprise: "Unlimited" },
  { key: "brainstorms", name: "Brainstorms / mo", free: "2", creator: "20", professional: "200", team: "Unlimited", enterprise: "Unlimited" },
  { key: "chat_messages", name: "AI Chat Messages / mo", free: "20", creator: "200", professional: "500", team: "Unlimited", enterprise: "Unlimited" },
  { key: "scheduling", name: "Scheduled Posts / mo", free: "2", creator: "Unlimited", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "versions", name: "Post Versions", free: "1", creator: "Unlimited", professional: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  { key: "image_generation", name: "AI Image Generation / mo", free: false, creator: "30", professional: "200", team: "Unlimited", enterprise: "Unlimited" },
  { key: "analytics", name: "Post Performance Analytics", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "ad_experience", name: "Ad Experience", free: "Full", creator: "Limited", professional: "None", team: "None", enterprise: "None" },
  { key: "workspaces", name: "Team Workspaces", free: false, creator: false, professional: false, team: true, enterprise: true },
  { key: "team_members", name: "Team Members", free: false, creator: false, professional: false, team: "5–150", enterprise: "150+" },
  { key: "brand_onboarding", name: "Brand Onboarding", free: false, creator: false, professional: false, team: true, enterprise: true },
  { key: "content_library", name: "Content Library", free: false, creator: false, professional: true, team: true, enterprise: true },
  { key: "hook_analysis", name: "AI Hook Analysis", free: false, creator: true, professional: true, team: true, enterprise: true },
  { key: "templates", name: "Post Templates", free: false, creator: false, professional: true, team: true, enterprise: true },
  { key: "calendar", name: "Content Calendar", free: "View only", creator: true, professional: true, team: true, enterprise: true },
  { key: "byok", name: "Bring Your Own AI Key (BYOK)", free: false, creator: false, professional: true, team: true, enterprise: true },
  { key: "ai_models", name: "AI Models", free: "System", creator: "System", professional: "All", team: "All", enterprise: "All" },
  { key: "enhance", name: "AI Enhancement & Hashtags", free: true, creator: true, professional: true, team: true, enterprise: true },
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

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_COOLDOWN_DAYS = 365;

export type AccountStatus = "active" | "trial" | "suspended" | "churned";

export const ACCOUNT_STATUS_CONFIG: Record<AccountStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  churned: { label: "Churned", color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300" },
};

export const CONTENT_LIBRARY_TYPES = {
  hook: { label: "Hook", color: "bg-orange-100 text-orange-700" },
  cta: { label: "CTA", color: "bg-blue-100 text-blue-700" },
  closing: { label: "Closing", color: "bg-green-100 text-green-700" },
  snippet: { label: "Snippet", color: "bg-purple-100 text-purple-700" },
} as const;
