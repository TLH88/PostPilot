/**
 * App-wide ambient background — four soft gradient blobs anchored to the
 * viewport corners + a dot-grid pattern with a vignette mask. Originally
 * lived inside <LaunchPadHome>; lifted to the (app) layout so every signed-in
 * page inherits the same ambient backdrop.
 *
 * Uses `fixed` positioning so the blobs don't scroll with content (feels
 * like a stable atmosphere rather than parallax decoration). `-z-10` keeps
 * everything behind page content; the (app) layout wraps this in an
 * `isolate` stacking context so the negative z-index doesn't leak past the
 * authenticated shell.
 */
export function AppBackground() {
  return (
    <>
      {/* Top-left grey blob — anchors the upper-left corner with a slate
          shadow that contrasts the colored blobs on the other three corners.
          Light-mode only: dark mode already feels balanced without it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 -top-40 -z-10 size-[63rem] rounded-full bg-gradient-to-bl from-slate-600/45 via-slate-500/30 to-transparent blur-3xl dark:hidden"
      />
      {/* Top-right gradient blob — strong brand blue.
          Light mode uses pastel 200-stops so the blob reads as a soft sky
          tint rather than a saturated splotch on a near-white page. Dark
          mode keeps the deeper 500/600 stops since they blend into navy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 -top-40 -z-10 size-[42rem] rounded-full bg-gradient-to-br from-blue-400/75 via-sky-300/60 to-transparent blur-3xl dark:from-blue-600/35 dark:via-blue-500/25"
      />
      {/* Mid-right secondary blob — fills the right side as the page gets taller */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-48 top-1/2 -z-10 size-[38rem] -translate-y-1/4 rounded-full bg-gradient-to-l from-sky-400/60 via-cyan-300/45 to-transparent blur-3xl dark:from-sky-500/25 dark:via-cyan-500/15"
      />
      {/* Bottom-left gradient blob — anchors the lower half */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 -left-32 -z-10 size-[42rem] rounded-full bg-gradient-to-tr from-indigo-500/65 via-purple-400/55 to-transparent blur-3xl dark:from-indigo-600/35 dark:via-purple-500/20"
      />
      {/* Bottom-center accent — soft glow to lift the empty area */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-24 left-1/3 -z-10 size-[28rem] rounded-full bg-gradient-to-t from-violet-500/50 to-transparent blur-3xl dark:from-violet-500/20"
      />

      {/* Full-bleed dot-grid pattern with a soft vignette so it never feels harsh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.25] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-muted-foreground, #94a3b8)",
          maskImage:
            "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
        }}
      />
    </>
  );
}
