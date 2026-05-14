import DOMPurify from "isomorphic-dompurify";

/**
 * Allow-list for HTML produced by the TipTap editor in the admin email
 * composer. Deliberately narrow: matches the editor's enabled extensions
 * (paragraph, bold/italic, headings H2/H3, ordered/bullet lists, links).
 *
 * If you widen the editor extension list, widen this allow-list too —
 * but do it together and never independently. See:
 *   - src/components/ui/rich-text-editor.tsx (editor config)
 *   - emails/admin-message.tsx (renderer)
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "width", "height"];

const FORBID_ATTR = ["style", "class", "id", "onclick", "onload", "onerror"];

/**
 * Sanitize admin-authored HTML before it gets stored in the audit log
 * or rendered into an outbound email. Strips everything not on the
 * allow-list and forces all anchor tags to safe rel + target attrs.
 *
 * Always run on the server; the client editor cannot be trusted.
 */
export function sanitizeAdminEmailHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|cid):/i,
  });

  // Belt-and-braces: enforce safe rel/target on every <a>. DOMPurify
  // hooks could do this too, but a regex post-pass keeps the surface
  // small and easy to audit.
  return sanitized.replace(
    /<a\s+([^>]*)>/gi,
    (_match, attrs) => {
      const withoutTarget = attrs.replace(/\s*target\s*=\s*"[^"]*"/gi, "");
      const withoutRel = withoutTarget.replace(/\s*rel\s*=\s*"[^"]*"/gi, "");
      return `<a ${withoutRel.trim()} target="_blank" rel="noopener noreferrer">`;
    },
  );
}

/**
 * Convert sanitized HTML to a plain-text approximation for the audit
 * log search column. Not used for rendering; do not trust for security.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
