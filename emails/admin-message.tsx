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
import parse, {
  type HTMLReactParserOptions,
  Element as HrpElement,
  domToReact,
  type DOMNode,
} from "html-react-parser";

/**
 * Public URL for the brand mark — same file is served by Next.js at
 * /icon.svg in the deployed app. Email clients that support SVG (Gmail,
 * Apple Mail, Outlook.com/365 modern) render this inline; clients that
 * don't (Outlook desktop) fall back to the alt text.
 */
const DEFAULT_BASE_URL = "https://mypostpilot.app";

export interface AdminMessageEmailProps {
  recipientName?: string;
  subject: string;
  /** Sanitized HTML body — must already be passed through DOMPurify on the server. */
  bodyHtml: string;
  /** Preview text shown in inbox lists before the message is opened. */
  preview?: string;
  greeting?: string;
  signatureHtml?: string;
  /** Legacy default signoff — used only when signatureHtml is absent. */
  signoff?: string;
  footerHtmlBlocks?: string[];
  showLogo?: boolean;
  /**
   * Base URL used to resolve the logo. Defaults to production. Preview
   * passes the request origin so the logo loads on localhost / preview
   * deploys before prod has the new asset.
   */
  baseUrl?: string;
}

/**
 * Inline styles applied to common HTML tags in admin-authored body
 * content. We can't use Tailwind arbitrary variants like `[&_p]:my-3`
 * because @react-email/tailwind doesn't support descendant selectors —
 * it would apply the class to the parent and bleed styles into siblings.
 */
const TAG_STYLES: Record<string, React.CSSProperties> = {
  p: { margin: "12px 0", color: "#334155", fontSize: "16px", lineHeight: "24px" },
  h2: { fontSize: "18px", fontWeight: 600, color: "#0f172a", marginTop: "20px", marginBottom: "8px" },
  h3: { fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px", marginBottom: "8px" },
  ul: { listStyleType: "disc", paddingLeft: "20px", margin: "12px 0", color: "#334155" },
  ol: { listStyleType: "decimal", paddingLeft: "20px", margin: "12px 0", color: "#334155" },
  li: { margin: "4px 0" },
  strong: { fontWeight: 600 },
  em: { fontStyle: "italic" },
  u: { textDecoration: "underline" },
  s: { textDecoration: "line-through" },
  span: {}, // pass-through; admin inline styles below apply on top
  img: { maxWidth: "100%", borderRadius: "6px", margin: "8px 0", display: "block" },
};

const LINK_STYLE: React.CSSProperties = { color: "#2563eb", textDecoration: "underline" };
const FOOTER_STYLE: React.CSSProperties = { fontSize: "12px", color: "#64748b", margin: "8px 0", lineHeight: "18px" };

/**
 * Parse a TipTap-edited inline style attribute string into a React
 * style object. Keeps only safe CSS properties — admin is trusted, but
 * the parsed result is sent to recipients and we want a tight allow-list
 * so a compromised admin can't smuggle anything weird through.
 */
const ALLOWED_INLINE_CSS = new Set([
  "color",
  "background-color",
  "font-family",
  "font-weight",
  "font-style",
  "font-size",
  "text-align",
  "text-decoration",
]);

function parseInlineStyle(style: string | undefined): React.CSSProperties {
  if (!style) return {};
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;
    if (!ALLOWED_INLINE_CSS.has(prop)) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = val;
  }
  return out as React.CSSProperties;
}

function buildBodyParseOptions(): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof HrpElement)) return undefined;
      const name = node.name;
      const tagStyle = TAG_STYLES[name];
      const adminStyle = parseInlineStyle(node.attribs.style);

      if (name === "a") {
        const href = node.attribs.href ?? "#";
        return (
          <a
            href={href}
            title={href}
            target={node.attribs.target ?? "_blank"}
            rel={node.attribs.rel ?? "noopener noreferrer"}
            style={{ ...LINK_STYLE, ...adminStyle }}
          >
            {domToReact(node.children as DOMNode[], options)}
          </a>
        );
      }
      if (name === "img") {
        return (
          <img
            src={node.attribs.src}
            alt={node.attribs.alt ?? ""}
            style={{ ...TAG_STYLES.img, ...adminStyle }}
          />
        );
      }
      if (tagStyle) {
        // Use createElement-style JSX so the tag name stays dynamic.
        const Tag = name as keyof React.JSX.IntrinsicElements;
        return (
          <Tag style={{ ...tagStyle, ...adminStyle }}>
            {domToReact(node.children as DOMNode[], options)}
          </Tag>
        );
      }
      return undefined;
    },
  };
  return options;
}

function buildFooterParseOptions(): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof HrpElement)) return undefined;
      if (node.name === "a") {
        const href = node.attribs.href ?? "#";
        return (
          <a
            href={href}
            title={href}
            target={node.attribs.target ?? "_blank"}
            rel={node.attribs.rel ?? "noopener noreferrer"}
            style={LINK_STYLE}
          >
            {domToReact(node.children as DOMNode[], options)}
          </a>
        );
      }
      if (node.name === "p") {
        return <p style={FOOTER_STYLE}>{domToReact(node.children as DOMNode[], options)}</p>;
      }
      return undefined;
    },
  };
  return options;
}

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
  baseUrl = DEFAULT_BASE_URL,
}: AdminMessageEmailProps) {
  const previewText = preview ?? subject;
  const greetingFallbackName = recipientName?.trim() || "there";
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/icon.svg`;

  const bodyOptions = buildBodyParseOptions();
  const footerOptions = buildFooterParseOptions();

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
                          src={logoUrl}
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
            <Section>{parse(bodyHtml, bodyOptions)}</Section>
            {signatureHtml ? (
              <Section style={{ marginTop: "24px", fontSize: "16px", color: "#334155" }}>
                {parse(signatureHtml, bodyOptions)}
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
                  <Section key={i} style={{ marginBottom: "8px" }}>
                    {parse(html, footerOptions)}
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
