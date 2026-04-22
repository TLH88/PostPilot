"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TutorialDefinition, TutorialStorageAdapter } from "../core/types";
import { useTutorial } from "./TutorialProvider";

interface TutorialGateProps {
  /** The tutorial to start if user accepts */
  tutorial: TutorialDefinition;
  /** Storage adapter (must match the one passed to TutorialProvider) */
  storage: TutorialStorageAdapter;
  /** User ID for server-side storage */
  userId?: string;
  /** Custom title text */
  title?: string;
  /** Custom description text */
  description?: string;
  /** Custom accept button text */
  acceptText?: string;
  /** Custom decline button text */
  declineText?: string;
}

/**
 * First-login gate component.
 *
 * BP-035 / Phase C.1: Smarter re-prompt logic.
 *
 * The previous implementation marked `first_login_prompt_shown=true` on BOTH
 * accept and decline. If the user accepted and the tutorial then crashed or
 * the user closed it before finishing, they would never see the gate again
 * and had to discover the Help → Tutorials menu to retry.
 *
 * New behavior:
 *   - User has never seen the gate AND tutorial is not completed → show
 *     the standard "Want a tour?" modal.
 *   - User accepted previously, started the tutorial, but didn't finish AND
 *     hasn't completed it AND we have saved progress > 0 → show a "resume"
 *     prompt instead.
 *   - User declined OR completed the tutorial → never show again.
 *
 * The decline check still uses `isFirstLogin()` for backwards compatibility.
 * Resume detection uses `getProgress()` and `isCompleted()`.
 */
export function TutorialGate({
  tutorial,
  storage,
  userId,
  title,
  description,
  acceptText = "Yes, show me around",
  declineText = "No thanks, I'll explore on my own",
}: TutorialGateProps) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"first-login" | "resume">("first-login");
  const { startTutorial } = useTutorial();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        // Tutorial already completed — never re-prompt
        const completed = await storage.isCompleted(tutorial.id, userId);
        if (cancelled || completed) return;

        const firstLogin = await storage.isFirstLogin(userId);
        if (cancelled) return;

        if (firstLogin) {
          setMode("first-login");
          setTimeout(() => {
            if (!cancelled) setShow(true);
          }, 1500);
          return;
        }

        // User has been prompted before. If they have meaningful progress
        // (started but didn't finish), offer to resume.
        const progress = await storage.getProgress(tutorial.id, userId);
        if (cancelled) return;
        if (progress > 0 && progress < tutorial.steps.length) {
          setMode("resume");
          setTimeout(() => {
            if (!cancelled) setShow(true);
          }, 1500);
        }
      } catch {
        // If storage check fails, don't show the gate
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [storage, userId, tutorial]);

  async function handleAccept() {
    setShow(false);
    try {
      // Only mark "shown" the very first time. Resume prompts don't
      // need to update this — the user is already past first-login.
      if (mode === "first-login") {
        await storage.markFirstLoginPromptShown(userId, "accepted");
      }
    } catch {
      // Continue even if storage fails
    }
    startTutorial(tutorial);
  }

  async function handleDecline() {
    setShow(false);
    try {
      // For first-login: record the decline so the gate doesn't reappear.
      // For resume: dismiss this session — but the gate will re-offer on
      // a future session as long as progress is incomplete. To permanently
      // dismiss, the user can complete or restart the tutorial from Help.
      if (mode === "first-login") {
        await storage.markFirstLoginPromptShown(userId, "declined");
      }
    } catch {
      // Continue even if storage fails
    }
  }

  // Pick copy based on mode
  const computedTitle =
    title ??
    (mode === "resume"
      ? "Want to pick up where you left off?"
      : "Welcome! Would you like a quick tour?");
  const computedDescription =
    description ??
    (mode === "resume"
      ? "You started a tour earlier but didn't finish. Want to continue, or skip for now? You can always restart any tutorial from the Help page."
      : "We'll show you around the app in just a few minutes. You can always access tutorials later from the Help page.");
  const computedAccept = mode === "resume" ? "Resume tour" : acceptText;
  const computedDecline = mode === "resume" ? "Skip for now" : declineText;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(2px)",
            }}
            onClick={handleDecline}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
          <div
            style={{
              width: "min(420px, calc(100vw - 2rem))",
              pointerEvents: "auto",
              background: "var(--tutorial-bg, #ffffff)",
              color: "var(--tutorial-bg-foreground, #0a0a0a)",
              border: "1px solid var(--tutorial-border, #e5e7eb)",
              borderRadius: "var(--tutorial-radius, 12px)",
              padding: "32px 24px",
              boxShadow: "0 20px 60px -12px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>
              {mode === "resume" ? "↩️" : "👋"}
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: "0 0 8px",
                lineHeight: 1.3,
              }}
            >
              {computedTitle}
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                margin: "0 0 24px",
                color: "var(--tutorial-muted-foreground, #6b7280)",
              }}
            >
              {computedDescription}
            </p>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <button
                onClick={handleAccept}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  borderRadius: "8px",
                  background: "var(--tutorial-primary, #3b82f6)",
                  color: "var(--tutorial-primary-foreground, #ffffff)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {computedAccept}
              </button>
              <button
                onClick={handleDecline}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid var(--tutorial-border, #e5e7eb)",
                  borderRadius: "8px",
                  background: "none",
                  color: "var(--tutorial-muted-foreground, #6b7280)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {computedDecline}
              </button>
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
