import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import parse from "html-react-parser";

export interface AdminMessageEmailProps {
  recipientName?: string;
  subject: string;
  /** Sanitized HTML body — must already be passed through DOMPurify on the server. */
  bodyHtml: string;
  /** Preview text shown in inbox lists before the message is opened. */
  preview?: string;
  /** Display name shown in the signoff. Defaults to "PostPilot Support". */
  signoff?: string;
  /** Show the PostPilot wordmark at the top of the email. Default true. */
  showLogo?: boolean;
}

/**
 * Template for direct admin-to-user messages composed in the User
 * Management admin tool. Body HTML is authored by an admin via TipTap,
 * sanitized server-side via DOMPurify, then parsed here into React
 * elements (no dangerouslySetInnerHTML). Two layers of defense:
 *   1. TipTap extension list constrains what can be produced
 *   2. DOMPurify on the server enforces an allow-list before render
 *
 * Do not loosen sanitization without re-evaluating the editor's
 * extension list — the two are deliberately matched.
 */
export function AdminMessageEmail({
  recipientName,
  subject,
  bodyHtml,
  preview,
  signoff = "PostPilot Support",
  showLogo = true,
}: AdminMessageEmailProps) {
  const previewText = preview ?? subject;
  const greetingName = recipientName?.trim() || "there";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] px-6 py-10">
            {showLogo && (
              <Section className="mb-6 text-center">
                <Text className="m-0 text-2xl font-bold tracking-tight text-slate-900">
                  Post<span className="text-blue-600">Pilot</span>
                </Text>
              </Section>
            )}
            <Heading className="text-xl font-semibold text-slate-900 m-0 mb-4">
              {subject}
            </Heading>
            <Text className="text-base text-slate-700">
              Hi {greetingName},
            </Text>
            <Section className="text-base text-slate-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline">
              {parse(bodyHtml)}
            </Section>
            <Text className="text-base text-slate-700 mt-6 mb-1">
              — {signoff}
            </Text>
            <Hr className="my-6 border-slate-200" />
            <Text className="text-xs text-slate-500">
              You received this because the PostPilot team sent you a message
              directly. To reply, just hit reply on this email — it will reach
              a real person on our support team.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default AdminMessageEmail;
