import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import parse from "html-react-parser";

/**
 * Public URL for the brand mark — same file is served by Next.js at
 * /icon.svg in the deployed app. Email clients that support SVG (Gmail,
 * Apple Mail, Outlook.com/365 modern) render this inline; clients that
 * don't (Outlook desktop) fall back to the alt text.
 */
const LOGO_URL = "https://mypostpilot.app/icon.svg";

export interface AdminMessageEmailProps {
  recipientName?: string;
  subject: string;
  /** Sanitized HTML body — must already be passed through DOMPurify on the server. */
  bodyHtml: string;
  /** Preview text shown in inbox lists before the message is opened. */
  preview?: string;
  /**
   * Optional pre-rendered greeting (e.g. "Hi Jane,"). Server should
   * substitute {firstName} placeholders before passing in. When omitted,
   * the template falls back to "Hi {recipientName},".
   */
  greeting?: string;
  /**
   * Optional sanitized signature HTML. When omitted, the template falls
   * back to a default text signoff using the legacy `signoff` prop.
   */
  signatureHtml?: string;
  /** Legacy default signoff — used only when signatureHtml is absent. */
  signoff?: string;
  /**
   * Optional pre-rendered footer HTML blocks. Each block is sanitized
   * server-side before being passed in. Rendered in array order below
   * the signature, separated by a thin divider.
   */
  footerHtmlBlocks?: string[];
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
  greeting,
  signatureHtml,
  signoff = "PostPilot Support",
  footerHtmlBlocks,
  showLogo = true,
}: AdminMessageEmailProps) {
  const previewText = preview ?? subject;
  const greetingFallbackName = recipientName?.trim() || "there";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] px-6 py-10">
            {showLogo && (
              <Section className="mb-6">
                <table cellPadding={0} cellSpacing={0} border={0}>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
                        <Img
                          src={LOGO_URL}
                          alt="PostPilot"
                          width="28"
                          height="28"
                          style={{ display: "block" }}
                        />
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            letterSpacing: "-0.01em",
                            color: "#0f172a",
                          }}
                        >
                          Post<span style={{ color: "#2563eb" }}>Pilot</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            )}
            <Heading className="text-xl font-semibold text-slate-900 m-0 mb-4">
              {subject}
            </Heading>
            <Text className="text-base text-slate-700">
              {greeting ?? `Hi ${greetingFallbackName},`}
            </Text>
            <Section className="text-base text-slate-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline">
              {parse(bodyHtml)}
            </Section>
            {signatureHtml ? (
              <Section className="text-base text-slate-700 mt-6 [&_p]:my-1 [&_a]:text-blue-600 [&_a]:underline">
                {parse(signatureHtml)}
              </Section>
            ) : (
              <Text className="text-base text-slate-700 mt-6 mb-1">
                — {signoff}
              </Text>
            )}
            {footerHtmlBlocks && footerHtmlBlocks.length > 0 && (
              <>
                <Hr className="my-6 border-slate-200" />
                {footerHtmlBlocks.map((html, i) => (
                  <Section
                    key={i}
                    className="text-xs text-slate-500 [&_p]:my-1 [&_a]:underline"
                  >
                    {parse(html)}
                  </Section>
                ))}
              </>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default AdminMessageEmail;
