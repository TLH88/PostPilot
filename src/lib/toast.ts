/**
 * Project toast contract (BYOK polish session, 2026-05-07).
 *
 * Every toast must fall into one of four categories. The category
 * determines color + icon + tone — see `src/components/ui/sonner.tsx`
 * for the visual definitions.
 *
 *   critical()     red    OctagonAlert  — system / data integrity
 *                                          failure; user must act or
 *                                          risks losing work
 *   important()    amber  ShieldAlert   — user-fixable input problem
 *                                          or "pay attention" notice
 *                                          (matches the API-key
 *                                          banner on /settings)
 *   informative()  blue   Info          — ambient confirmation that an
 *                                          async thing is in flight or
 *                                          about to happen
 *   success()      green  CircleCheck   — positive confirmation an
 *                                          action completed
 *
 * This module is a thin alias over sonner's `toast.error / .warning /
 * .info / .success`. The 240+ existing call sites continue to work
 * unchanged because the underlying methods route through the same
 * styling. Use the named helpers below for new code so the category
 * choice is explicit at the call site.
 *
 * Action buttons (navigation CTAs) — pass via the `action` option:
 *
 *   import { critical } from "@/lib/toast";
 *   import { useRouter } from "next/navigation";
 *
 *   const router = useRouter();
 *   critical("LinkedIn disconnected. Reconnect to keep publishing.", {
 *     action: {
 *       label: "Reconnect",
 *       onClick: () => router.push("/settings#linkedin"),
 *     },
 *   });
 *
 * The action button renders as a small primary-blue CTA on every
 * category, so it stays visually distinct from the toast's color tone.
 *
 * Toasts that *require* user action (Critical or Important categories
 * where the system needs the user to do something) should generally
 * include an action button so the user has a one-tap path to the place
 * they need to be.
 */

import { toast as sonnerToast } from "sonner";

type ToastInput = Parameters<typeof sonnerToast.error>;

/** Critical — red. Use when the system / data is in a bad state and
 *  the user must act or risks losing work. Maps to `toast.error`. */
export function critical(...args: ToastInput) {
  return sonnerToast.error(...args);
}

/** Important — amber. Use when input was rejected, a quota is nearly
 *  reached, or the user should pay attention but the system is fine.
 *  Maps to `toast.warning`. */
export function important(...args: ToastInput) {
  return sonnerToast.warning(...args);
}

/** Informative — blue. Use for ambient confirmations of in-flight or
 *  about-to-happen actions. Maps to `toast.info`. */
export function informative(...args: ToastInput) {
  return sonnerToast.info(...args);
}

/** Success — green. Use for positive confirmations that an action
 *  completed. Maps to `toast.success`. */
export function success(...args: ToastInput) {
  return sonnerToast.success(...args);
}

/** Re-export of the underlying sonner toast for callers that already
 *  import it directly. New code should prefer the named helpers above. */
export { toast } from "sonner";
