/**
 * BP-045 — Ad-blocker detection for Free + Personal tier hard-gate.
 *
 * Bait-element technique. Creates a transient DOM node decorated with
 * class names + IDs that consumer ad-blockers (uBlock Origin, AdBlock,
 * AdGuard, Brave Shields) routinely hide via CSS. After a brief settle
 * window, we inspect the node's computed visibility:
 *
 *   - offsetHeight === 0  → blocked (most blockers nuke height)
 *   - display:none        → blocked
 *   - visibility:hidden   → blocked
 *   - getBoundingClientRect().height === 0 → blocked
 *
 * Any one of these flips `blocked = true`. Returns false if the bait
 * survives every check.
 *
 * Known caveats:
 *   - Some privacy extensions (Privacy Badger, NoScript) may produce
 *     false positives. We accept that — the hard-gate's modal explains
 *     the situation and asks the user to disable shielding for this
 *     site.
 *   - SSR-safe: returns false (i.e. "not blocked") when called outside
 *     a browser context. The gate component only invokes this in a
 *     useEffect so the determination is always client-side.
 */

const BAIT_CLASSES = [
  "ad",
  "ads",
  "adsbox",
  "adsbygoogle",
  "ad-banner",
  "ad-placement",
  "advertisement",
  "sponsored",
  "google-ad",
  "banner-ad",
];

export async function detectAdBlocker(): Promise<boolean> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const bait = document.createElement("div");
  bait.className = BAIT_CLASSES.join(" ");
  bait.id = "adsbygoogle-ad-test";
  // Visible-ish dimensions so a non-blocking environment paints it.
  bait.style.cssText = [
    "position:absolute",
    "left:-9999px",
    "top:-9999px",
    "width:300px",
    "height:250px",
    "pointer-events:none",
  ].join(";");
  // Plain text content — no HTML parsing. We only need a non-empty node
  // so blockers have something to act on.
  bait.textContent = " ";

  document.body.appendChild(bait);

  // Settle one animation frame so injected stylesheets from the blocker
  // have a chance to apply. Two frames is even safer.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  let blocked = false;
  try {
    const computed = window.getComputedStyle(bait);
    const rect = bait.getBoundingClientRect();
    if (
      bait.offsetHeight === 0 ||
      bait.offsetParent === null ||
      computed.display === "none" ||
      computed.visibility === "hidden" ||
      rect.height === 0
    ) {
      blocked = true;
    }
  } finally {
    bait.remove();
  }

  return blocked;
}
