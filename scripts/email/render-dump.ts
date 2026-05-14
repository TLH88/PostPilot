/**
 * Local rendering sanity check. Renders AdminMessageEmail with sample
 * content and dumps the resulting HTML. Useful for verifying the
 * template transform pipeline (anchor title attribute, list margins,
 * inline styles) without spinning up the dev server or going through
 * the admin auth gate.
 *
 *   tsx scripts/email/render-dump.ts | grep -E '<a|<ul|<li'
 */

import { render } from "@react-email/render";
import { AdminMessageEmail } from "../../emails/admin-message";

async function main() {
  const html = await render(
    AdminMessageEmail({
      recipientName: "Test",
      subject: "Render test",
      bodyHtml:
        '<p>Plain paragraph.</p>' +
        '<p>Contact <a href="mailto:support@mypostpilot.app">us</a> at <a href="https://mypostpilot.app">our site</a>.</p>' +
        '<ul><li><p>Item one</p></li><li><p>Item two</p></li><li><p>Item three</p></li></ul>' +
        '<p>Closing line.</p>',
      showLogo: true,
      footerHtmlBlocks: [
        '<p>Need to unsubscribe? <a href="https://mypostpilot.app/unsubscribe">Click here</a>.</p>',
      ],
    }),
  );
  console.log(html);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
