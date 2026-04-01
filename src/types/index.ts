export interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  headline: string | null;
  linkedin_url: string | null;
  resume_text: string | null;
  linkedin_about: string | null;
  expertise_areas: string[];
  industries: string[];
  target_audience: string | null;
  writing_tone: string;
  voice_samples: string[];
  content_pillars: string[];
  preferred_post_length: string;
  use_emojis: boolean;
  use_hashtags: boolean;
  onboarding_completed: boolean;
  ai_provider: "anthropic" | "openai" | "google" | "perplexity";
  ai_model: string | null;
  ai_api_key_encrypted: string | null;
  ai_api_key_iv: string | null;
  ai_api_key_auth_tag: string | null;
  // LinkedIn API connection (separate from Supabase OIDC login)
  linkedin_access_token_encrypted: string | null;
  linkedin_access_token_iv: string | null;
  linkedin_access_token_auth_tag: string | null;
  linkedin_refresh_token_encrypted: string | null;
  linkedin_refresh_token_iv: string | null;
  linkedin_refresh_token_auth_tag: string | null;
  linkedin_token_expires_at: string | null;
  linkedin_member_id: string | null;
  linkedin_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source: string | null;
  temperature: "hot" | "warm" | "cold";
  content_pillar: string | null;
  tags: string[];
  status: "captured" | "developing" | "converted" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  idea_id: string | null;
  title: string | null;
  content: string;
  status: "draft" | "review" | "scheduled" | "posted" | "past_due" | "archived";
  scheduled_for: string | null;
  posted_at: string | null;
  hashtags: string[];
  character_count: number;
  ai_notes: string | null;
  // LinkedIn posting
  linkedin_post_id: string | null;
  linkedin_post_url: string | null;
  publish_attempts: number;
  publish_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostVersion {
  id: string;
  post_id: string;
  user_id: string;
  title: string | null;
  content: string;
  version_number: number;
  label: string | null;
  created_at: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  description: string;
  features: { title: string; description: string }[];
  bug_fixes: { title: string; description: string }[];
  is_published: boolean;
  published_at: string;
  created_at: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  post_id: string | null;
  context_type: "post" | "brainstorm" | "general";
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}
