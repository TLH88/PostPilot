/**
 * One-off smoke test for the BP-164 email pipeline.
 *
 *   npm run email:send-test [-- --to=address@example.com] [--from=hello|noreply|news]
 *
 * Calls sendEmail() directly, bypassing the admin API route. Validates:
 *   - Resend API key resolves (RESEND_API_KEY or RESEND_PRODUCTION_API_KEY)
 *   - Domain verification routes the email through Resend → recipient inbox
 *   - DKIM/SPF/DMARC alignment passes
 *   - React Email template renders to deliverable HTML
 *   - sendEmail wrapper succeeds end-to-end
 *
 * Defaults to `support@mypostpilot.app` from `hello@` so a same-domain
 * delivery loop also confirms Fastmail receives mail on the root MX while
 * Resend sends from `send.` subdomain.
 *
 * Run via: tsx --env-file=.env.local scripts/email/send-test.ts
 */

import { sendEmail } from "../../src/lib/email/send";
import { TestSendEmail } from "../../emails/test-send";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit?.slice(prefix.length);
}

async function main() {
  const to = parseArg("to") ?? "support@mypostpilot.app";
  const fromArg = (parseArg("from") ?? "hello") as "hello" | "noreply" | "news";

  if (!["hello", "noreply", "news"].includes(fromArg)) {
    console.error(`[send-test] invalid --from='${fromArg}' (must be hello|noreply|news)`);
    process.exit(1);
  }

  const apiKey =
    process.env.RESEND_API_KEY ??
    process.env.RESEND_LOCAL_DEV_API_KEY ??
    process.env.RESEND_PRODUCTION_API_KEY;
  if (!apiKey) {
    console.error(
      "[send-test] No Resend API key in env. Expected one of: RESEND_API_KEY, RESEND_LOCAL_DEV_API_KEY, RESEND_PRODUCTION_API_KEY.",
    );
    process.exit(1);
  }
  console.log(`[send-test] api key prefix: ${apiKey.slice(0, 7)}…  (length ${apiKey.length})`);
  console.log(`[send-test] sending: from=${fromArg}  to=${to}`);

  const result = await sendEmail({
    from: fromArg,
    to,
    subject: "PostPilot email — delivery test (CLI)",
    react: TestSendEmail({
      recipientName: to.split("@")[0],
      sentAt: new Date().toISOString(),
    }),
    idempotencyKey: `cli-send-test/${Date.now()}`,
    tags: [
      { name: "category", value: "test" },
      { name: "source", value: "cli" },
      { name: "sender", value: fromArg },
    ],
    replyTo: fromArg === "noreply" ? null : undefined,
  });

  if (!result.ok) {
    console.error("[send-test] FAILED");
    console.error(JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  console.log(`[send-test] OK  resend message id: ${result.id}`);
  console.log(`[send-test] check inbox: ${to}`);
  console.log(`[send-test] check Resend dashboard → Logs for delivery status`);
}

main().catch((err) => {
  console.error("[send-test] unhandled error:");
  console.error(err);
  process.exit(1);
});
