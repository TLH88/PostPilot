import type { TutorialStorageAdapter } from "../core/types";

/**
 * LocalStorage-based tutorial storage adapter.
 * Suitable for single-user apps or development/testing.
 * All methods return Promises for interface consistency.
 */
export class LocalStorageAdapter implements TutorialStorageAdapter {
  private prefix: string;

  constructor(prefix = "tutorial-sdk:") {
    this.prefix = prefix;
  }

  private key(tutorialId: string, suffix: string): string {
    return `${this.prefix}${tutorialId}:${suffix}`;
  }

  async markCompleted(tutorialId: string): Promise<void> {
    localStorage.setItem(this.key(tutorialId, "completed"), "true");
    localStorage.setItem(
      this.key(tutorialId, "completed_at"),
      new Date().toISOString()
    );
    // Clear progress since it's done
    localStorage.removeItem(this.key(tutorialId, "progress"));
  }

  async isCompleted(tutorialId: string): Promise<boolean> {
    return localStorage.getItem(this.key(tutorialId, "completed")) === "true";
  }

  async getProgress(tutorialId: string): Promise<number> {
    const val = localStorage.getItem(this.key(tutorialId, "progress"));
    return val ? parseInt(val, 10) : 0;
  }

  async saveProgress(tutorialId: string, step: number): Promise<void> {
    localStorage.setItem(this.key(tutorialId, "progress"), String(step));
  }

  async isFirstLogin(): Promise<boolean> {
    return (
      localStorage.getItem(`${this.prefix}first_login_prompt_shown`) !== "true"
    );
  }

  async markFirstLoginPromptShown(
    _userId?: string,
    response?: "accepted" | "declined"
  ): Promise<void> {
    localStorage.setItem(`${this.prefix}first_login_prompt_shown`, "true");
    if (response) {
      localStorage.setItem(
        `${this.prefix}first_login_prompt_response`,
        response
      );
    }
  }
}
