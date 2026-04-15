import type { TutorialStorageAdapter } from "../core/types";

/**
 * Duck-typed Supabase client interface.
 * The host app passes its own Supabase client — we never import @supabase/supabase-js.
 */
export interface SupabaseClientLike {
  from(table: string): SupabaseQueryBuilder;
}

interface SupabaseQueryBuilder {
  select(columns: string): SupabaseFilterBuilder;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseFilterBuilder;
  update(values: Record<string, unknown>): SupabaseFilterBuilder;
  upsert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseFilterBuilder;
  delete(): SupabaseFilterBuilder;
}

interface SupabaseFilterBuilder {
  eq(column: string, value: unknown): SupabaseFilterBuilder;
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
  then(resolve: (value: { data: unknown; error: unknown }) => void): void;
}

/**
 * Supabase-based tutorial storage adapter.
 * Uses `tutorial_progress` and `tutorial_user_state` tables.
 */
export class SupabaseAdapter implements TutorialStorageAdapter {
  constructor(
    private client: SupabaseClientLike,
    private userId: string
  ) {}

  async markCompleted(tutorialId: string): Promise<void> {
    await this.client.from("tutorial_progress").upsert({
      user_id: this.userId,
      tutorial_id: tutorialId,
      completed: true,
      completed_at: new Date().toISOString(),
      current_step: 0,
      updated_at: new Date().toISOString(),
    });
  }

  async isCompleted(tutorialId: string): Promise<boolean> {
    const { data } = await this.client
      .from("tutorial_progress")
      .select("completed")
      .eq("user_id", this.userId)
      .eq("tutorial_id", tutorialId)
      .single();
    return (data as Record<string, unknown> | null)?.completed === true;
  }

  async getProgress(tutorialId: string): Promise<number> {
    const { data } = await this.client
      .from("tutorial_progress")
      .select("current_step")
      .eq("user_id", this.userId)
      .eq("tutorial_id", tutorialId)
      .single();
    return ((data as Record<string, unknown> | null)?.current_step as number) ?? 0;
  }

  async saveProgress(tutorialId: string, step: number): Promise<void> {
    await this.client.from("tutorial_progress").upsert({
      user_id: this.userId,
      tutorial_id: tutorialId,
      current_step: step,
      updated_at: new Date().toISOString(),
    });
  }

  async isFirstLogin(): Promise<boolean> {
    const { data } = await this.client
      .from("tutorial_user_state")
      .select("first_login_prompt_shown")
      .eq("user_id", this.userId)
      .single();
    if (!data) return true; // No row = first login
    return (data as Record<string, unknown>).first_login_prompt_shown !== true;
  }

  async markFirstLoginPromptShown(
    _userId?: string,
    response?: "accepted" | "declined"
  ): Promise<void> {
    await this.client.from("tutorial_user_state").upsert({
      user_id: this.userId,
      first_login_prompt_shown: true,
      first_login_prompt_response: response ?? null,
    });
  }
}
