"use client";

import type { LiveAnimationConfig } from "../core/types";

interface LiveAnimationPlayerProps {
  config: LiveAnimationConfig;
  width?: number;
  height?: number;
}

/**
 * Live animation player — Phase 2 implementation.
 *
 * This component will render programmatic cursor/interaction
 * animations within the card's media slot. For now it shows
 * a placeholder.
 */
export function LiveAnimationPlayer({
  config,
  width = 320,
  height = 180,
}: LiveAnimationPlayerProps) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--tutorial-muted, #f3f4f6)",
        borderRadius: "8px",
        color: "var(--tutorial-muted-foreground, #6b7280)",
        fontSize: "12px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", marginBottom: "4px" }}>▶</div>
        <div>Animation ({config.steps.length} steps)</div>
      </div>
    </div>
  );
}
