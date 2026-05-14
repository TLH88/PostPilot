/**
 * Sender identity registry. All app email must originate from one of these
 * addresses so deliverability stays consistent and recipients learn what to
 * expect from each one.
 *
 * - NOREPLY: automated transactional (usage reports, alerts, password resets).
 *   Replies are discarded — never send something a user might want to reply to.
 * - HELLO: human-touch transactional (welcomes, onboarding nudges, billing
 *   receipts). Replies route to the Fastmail inbox.
 * - NEWS: marketing / newsletter / product updates. Reply-to = HELLO so
 *   curious replies still reach a human.
 * - SUPPORT: direct admin-to-user messages (help responses, manual outreach).
 *   Reply-to = SUPPORT so the conversation continues in the support@ inbox.
 *   Fastmail receives via the root MX; no Resend Receiving needed.
 */

const DOMAIN = "mypostpilot.app";
const BRAND = "PostPilot";

export const EMAIL_FROM = {
  noreply: `${BRAND} <noreply@${DOMAIN}>`,
  hello: `${BRAND} <hello@${DOMAIN}>`,
  news: `${BRAND} <news@${DOMAIN}>`,
  support: `PostPilot Support <support@${DOMAIN}>`,
} as const;

export const EMAIL_REPLY_TO = {
  hello: `hello@${DOMAIN}`,
  support: `support@${DOMAIN}`,
} as const;

export type EmailSenderKey = keyof typeof EMAIL_FROM;
