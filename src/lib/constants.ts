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

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/ideas", label: "Idea Bank", icon: "Lightbulb" },
  { href: "/posts", label: "Posts", icon: "FileText" },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
] as const;
