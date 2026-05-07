"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  ShieldAlert,
  OctagonAlertIcon,
  Loader2Icon,
} from "lucide-react"

/**
 * Project-wide toast styling — owner direction 2026-05-07.
 *
 * Every toast falls into a category, the category drives color + icon.
 * Sonner already exposes the four `toast.error / .warning / .info /
 * .success` methods, so we keep the call-site API unchanged and style
 * the categories from one place here.
 *
 *   Critical     toast.error     red highlight + red border + OctagonAlert
 *   Important    toast.warning   amber highlight + amber border + ShieldAlert
 *                                (matches the API-key-sharing banner on /settings)
 *   Informative  toast.info      blue highlight + blue border + Info
 *   Success      toast.success   green highlight + green border + CircleCheck
 *
 * Category usage guide for callers:
 *
 *   Critical  -> publish failed, data integrity issue, system/auth failure;
 *                user must act or risks losing work.
 *   Important -> validation issue, quota nearly reached, user-fixable
 *                input problem; the system is fine but the user should
 *                pay attention.
 *   Informative -> ambient confirmation that an async thing is in flight
 *                or about to happen ("Refreshing model list...", "Saved
 *                draft snapshot").
 *   Success   -> positive confirmation an action completed successfully
 *                ("Post published", "Key saved").
 *
 * Action buttons (sonner's `action: { label, onClick }` option) render
 * as a small primary-blue CTA across every category — distinct from the
 * toast's color theme so the call-to-action stays visually obvious.
 *
 * Example with action (Critical + navigation CTA):
 *
 *   import { toast } from "sonner";
 *   toast.error("LinkedIn disconnected. Reconnect to keep publishing.", {
 *     action: {
 *       label: "Reconnect",
 *       onClick: () => router.push("/settings#linkedin"),
 *     },
 *   });
 *
 * Helper at `src/lib/toast.ts` re-exports the same API with stricter
 * typing for the action option, in case you want compile-time hints
 * for which calls require a navigation CTA.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <ShieldAlert className="size-4" />,
        error: <OctagonAlertIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          // Base toast surface — borders/shadow/radius shared by every category.
          toast:
            "group toast cn-toast border shadow-md rounded-lg [&_[data-icon]]:shrink-0",
          title: "font-medium",
          description: "text-sm opacity-90",

          // Action button — primary blue across all categories. Stands
          // out against any of the four colored fills below.
          actionButton:
            "!bg-primary !text-primary-foreground !text-xs !font-semibold !rounded-md !px-2.5 !py-1 hover:!bg-primary/90",
          cancelButton:
            "!bg-transparent !text-muted-foreground !text-xs !rounded-md !px-2.5 !py-1 hover:!bg-muted",

          // Critical (red)
          error:
            "!bg-red-50 !text-red-900 !border-red-300 dark:!bg-red-950/50 dark:!text-red-100 dark:!border-red-800/60 [&_[data-icon]]:!text-red-600 dark:[&_[data-icon]]:!text-red-400",

          // Important (amber/orange)
          warning:
            "!bg-amber-50 !text-amber-900 !border-amber-300 dark:!bg-amber-950/50 dark:!text-amber-100 dark:!border-amber-800/60 [&_[data-icon]]:!text-amber-600 dark:[&_[data-icon]]:!text-amber-400",

          // Informative (blue)
          info:
            "!bg-blue-50 !text-blue-900 !border-blue-300 dark:!bg-blue-950/50 dark:!text-blue-100 dark:!border-blue-800/60 [&_[data-icon]]:!text-blue-600 dark:[&_[data-icon]]:!text-blue-400",

          // Success (emerald)
          success:
            "!bg-emerald-50 !text-emerald-900 !border-emerald-300 dark:!bg-emerald-950/50 dark:!text-emerald-100 dark:!border-emerald-800/60 [&_[data-icon]]:!text-emerald-600 dark:[&_[data-icon]]:!text-emerald-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
