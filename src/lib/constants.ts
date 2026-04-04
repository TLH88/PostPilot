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

export const IDEA_TEMPERATURES = {
  hot: { label: "Hot", color: "bg-red-100 text-red-700", icon: "🔥" },
  warm: { label: "Warm", color: "bg-orange-100 text-orange-700", icon: "☀️" },
  cold: { label: "Cold", color: "bg-blue-100 text-blue-700", icon: "❄️" },
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
export type SubscriptionTier = "free" | "creator" | "professional";
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
} as const;

// Map quota DB columns to QuotaType keys
export const QUOTA_COLUMN_MAP: Record<QuotaType, string> = {
  posts: "posts_created",
  brainstorms: "brainstorms_used",
  chat_messages: "chat_messages_used",
  scheduled_posts: "scheduled_posts",
} as const;

export const CONTENT_LIBRARY_TYPES = {
  hook: { label: "Hook", color: "bg-orange-100 text-orange-700" },
  cta: { label: "CTA", color: "bg-blue-100 text-blue-700" },
  closing: { label: "Closing", color: "bg-green-100 text-green-700" },
  snippet: { label: "Snippet", color: "bg-purple-100 text-purple-700" },
} as const;
