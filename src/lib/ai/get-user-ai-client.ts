import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createAIClient, type AIClient, type AIProvider } from "./providers";
import type { CreatorProfile } from "@/types";

interface UserAIContext {
  client: AIClient;
  profile: CreatorProfile;
}

export async function getUserAIClient(): Promise<UserAIContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Please complete your profile first");
  }

  const creatorProfile = profile as CreatorProfile;

  // Decrypt the user's API key
  if (
    !creatorProfile.ai_api_key_encrypted ||
    !creatorProfile.ai_api_key_iv ||
    !creatorProfile.ai_api_key_auth_tag
  ) {
    throw new Error(
      "No API key configured. Please add your API key in Settings."
    );
  }

  const apiKey = decrypt({
    ciphertext: creatorProfile.ai_api_key_encrypted,
    iv: creatorProfile.ai_api_key_iv,
    authTag: creatorProfile.ai_api_key_auth_tag,
  });

  const client = createAIClient(
    creatorProfile.ai_provider as AIProvider,
    apiKey,
    creatorProfile.ai_model
  );

  return { client, profile: creatorProfile };
}
