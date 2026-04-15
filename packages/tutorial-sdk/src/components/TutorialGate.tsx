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
 * Shows a modal asking the user if they'd like a tutorial.
 * Only appears once — records the user's choice via the storage adapter.
 */
export function TutorialGate({
  tutorial,
  storage,
  userId,
  title = "Welcome! Would you like a quick tour?",
  description = "We'll show you around the app in just a few minutes. You can always access tutorials later from the Help page.",
  acceptText = "Yes, show me around",
  declineText = "No thanks, I'll explore on my own",
}: TutorialGateProps) {
  const [show, setShow] = useState(false);
  const { startTutorial } = useTutorial();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const firstLogin = await storage.isFirstLogin(userId);
        if (!cancelled && firstLogin) {
          // Small delay so the app has time to render first
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
  }, [storage, userId]);

  async function handleAccept() {
    setShow(false);
    try {
      await storage.markFirstLoginPromptShown(userId, "accepted");
    } catch {
      // Continue even if storage fails
    }
    startTutorial(tutorial);
  }

  async function handleDecline() {
    setShow(false);
    try {
      await storage.markFirstLoginPromptShown(userId, "declined");
    } catch {
      // Continue even if storage fails
    }
  }

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
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>👋</div>

            {/* Title */}
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: "0 0 8px",
                lineHeight: 1.3,
              }}
            >
              {title}
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
              {description}
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
                {acceptText}
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
                {declineText}
              </button>
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
