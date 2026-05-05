/**
 * Slash command registry for the post editor and the AI chat input.
 *
 * Two kinds of commands:
 *   - kind: "enhance"  → runs an enhancement template against the current
 *                        draft via /api/ai/enhance. Result replaces the draft.
 *   - kind: "hashtags" → calls /api/ai/hashtags to generate hashtags from
 *                        the current draft. Result populates the hashtag list.
 *
 * Triggered by typing "/" at the start of a token in either the editor
 * textarea or the chat input. Selecting a command erases the typed
 * "/<word>" and runs the action.
 */

import type { EnhancementTemplateKey } from "@/lib/ai/enhancement-templates";

export type SlashCommandKind = "enhance" | "hashtags";

export interface SlashCommand {
  /** Token typed after the slash, e.g. "hook" for /hook. Lowercase. */
  trigger: string;
  /** Short title shown in the autocomplete. */
  label: string;
  /** One-line description shown in the autocomplete. */
  description: string;
  kind: SlashCommandKind;
  /** Required when kind === "enhance" — which template to run. */
  template?: EnhancementTemplateKey;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { trigger: "hook",      label: "Add Hook",        description: "Strengthen the opening line",            kind: "enhance", template: "add_hook" },
  { trigger: "expand",    label: "Expand",          description: "Add depth to existing points",           kind: "enhance", template: "expand" },
  { trigger: "shorten",   label: "Shorten",         description: "Cut filler, ~15-20% shorter",            kind: "enhance", template: "tighten" },
  { trigger: "rewrite",   label: "Rewrite",         description: "Fresh take, same ideas",                 kind: "enhance", template: "rewrite" },
  { trigger: "closing",   label: "Add Closing",     description: "Logical conclusion, no reader ask",      kind: "enhance", template: "add_closing" },
  { trigger: "story",     label: "Make it Story",   description: "Reframe as a personal story",            kind: "enhance", template: "story_driven" },
  { trigger: "social",    label: "Add Social Proof",description: "Insert a stat, result, or quote",        kind: "enhance", template: "add_social_proof" },
  { trigger: "cta",       label: "Improve CTA",     description: "Sharpen the call-to-action",             kind: "enhance", template: "improve_cta" },
  { trigger: "personal",  label: "Make Personal",   description: "Strengthen 'I' voice and specifics",     kind: "enhance", template: "make_personal" },
  { trigger: "emojis",    label: "Add Emojis",      description: "Sparingly, on-brand",                    kind: "enhance", template: "add_emojis" },
  { trigger: "engaging",  label: "Make Engaging",   description: "Tighter pacing, sharper angle",          kind: "enhance", template: "make_engaging" },
  { trigger: "hashtags",  label: "Suggest Hashtags",description: "Generate hashtags from the draft",       kind: "hashtags" },
];

const TRIGGER_INDEX = new Map(SLASH_COMMANDS.map((c) => [c.trigger, c]));

/** Look up a command by exact trigger (case-insensitive). */
export function getSlashCommand(trigger: string): SlashCommand | undefined {
  return TRIGGER_INDEX.get(trigger.toLowerCase());
}

/**
 * Filter the registry against a partial trigger (e.g. "ho" → matches "hook").
 * Empty query returns the full list. Matching is prefix-first, then substring,
 * preserving registry order within each match class.
 */
export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  const prefix: SlashCommand[] = [];
  const substr: SlashCommand[] = [];
  for (const cmd of SLASH_COMMANDS) {
    if (cmd.trigger.startsWith(q)) prefix.push(cmd);
    else if (cmd.trigger.includes(q) || cmd.label.toLowerCase().includes(q)) substr.push(cmd);
  }
  return [...prefix, ...substr];
}

/**
 * Detect a slash-command-in-progress at the caret position. Returns the
 * partial trigger text (without the leading "/") and the index of the
 * leading "/" in `text`, or null if no active command.
 *
 * A slash starts a command when:
 *   - it's at the start of the text, OR
 *   - the character immediately before it is whitespace or a newline.
 *
 * The trigger ends at the caret OR at the next whitespace.
 */
export function detectSlashAtCaret(
  text: string,
  caret: number,
): { query: string; slashIndex: number } | null {
  if (caret < 1) return null;
  // Walk backward from caret to find a "/" that starts a command.
  let i = caret - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "/") {
      const prev = i === 0 ? "" : text[i - 1];
      if (i === 0 || /\s/.test(prev)) {
        const query = text.slice(i + 1, caret);
        // Bail out if the trigger has whitespace (command was already
        // committed and the user is typing a follow-up).
        if (/\s/.test(query)) return null;
        return { query, slashIndex: i };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
    i--;
  }
  return null;
}
