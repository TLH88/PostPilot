"use client";

import { motion } from "framer-motion";

interface TimeoutPromptProps {
  /** Restart the timer and replay the step hint */
  onShowAgain: () => void;
  /** Skip to the next step */
  onSkip: () => void;
  /** End the tutorial entirely */
  onEnd: () => void;
}

/**
 * Shown when the user hasn't completed the required action
 * within the allotted time (default 15 seconds).
 */
export function TimeoutPrompt({
  onShowAgain,
  onSkip,
  onEnd,
}: TimeoutPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{
        marginTop: "8px",
        background: "var(--tutorial-bg, #ffffff)",
        color: "var(--tutorial-bg-foreground, #0a0a0a)",
        border: "1px solid var(--tutorial-border, #e5e7eb)",
        borderRadius: "var(--tutorial-radius, 12px)",
        padding: "12px 16px",
        boxShadow: "0 8px 24px -4px rgba(0,0,0,0.15)",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: 600,
          margin: "0 0 8px",
        }}
      >
        Need some help?
      </p>
      <p
        style={{
          fontSize: "12px",
          margin: "0 0 12px",
          color: "var(--tutorial-muted-foreground, #6b7280)",
          lineHeight: 1.4,
        }}
      >
        It looks like you might need a hand with this step. What would you like
        to do?
      </p>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={onShowAgain}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid var(--tutorial-border, #e5e7eb)",
            borderRadius: "6px",
            background: "none",
            color: "var(--tutorial-bg-foreground, #0a0a0a)",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Show me again
        </button>
        <button
          onClick={onSkip}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid var(--tutorial-border, #e5e7eb)",
            borderRadius: "6px",
            background: "none",
            color: "var(--tutorial-bg-foreground, #0a0a0a)",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Skip step
        </button>
        <button
          onClick={onEnd}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "none",
            borderRadius: "6px",
            background: "var(--tutorial-muted, #f3f4f6)",
            color: "var(--tutorial-muted-foreground, #6b7280)",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          End tutorial
        </button>
      </div>
    </motion.div>
  );
}
