"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TutorialCard } from "./tutorial-card";
import type { TutorialStep } from "@/lib/tutorials/tutorial-engine";

interface TutorialOverlayProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  waitingForAction: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Custom spotlight overlay that highlights a target element
 * with an animated cutout and positions a tutorial card nearby.
 *
 * Uses CSS clip-path for the spotlight effect and Framer Motion
 * for smooth transitions between targets.
 */
export function TutorialOverlay({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  waitingForAction,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const padding = step.pointerPadding ?? 10;
  const radius = step.pointerRadius ?? 12;

  // Find and track the target element position
  const updateTargetRect = useCallback(() => {
    if (!step.selector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll element into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    // Small delay after scroll to get accurate position
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    });
  }, [step.selector, padding]);

  // Update on mount and step change
  useEffect(() => {
    // Delay to allow for route navigation
    const timer = setTimeout(updateTargetRect, 300);

    // Also update on scroll/resize
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [updateTargetRect, currentStep]);

  // Calculate card position relative to target
  const getCardPosition = (): React.CSSProperties => {
    if (!targetRect) {
      // Center in viewport when no target
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const side = step.side ?? "bottom";
    const cardWidth = 380;
    const cardGap = 16;

    switch (side) {
      case "bottom":
        return {
          position: "fixed",
          top: targetRect.top + targetRect.height + cardGap,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - cardWidth / 2,
            window.innerWidth - cardWidth - 16
          )),
        };
      case "top":
        return {
          position: "fixed",
          bottom: window.innerHeight - targetRect.top + cardGap,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - cardWidth / 2,
            window.innerWidth - cardWidth - 16
          )),
        };
      case "right":
        return {
          position: "fixed",
          top: Math.max(16, targetRect.top + targetRect.height / 2 - 100),
          left: Math.min(
            targetRect.left + targetRect.width + cardGap,
            window.innerWidth - cardWidth - 16
          ),
        };
      case "left":
        return {
          position: "fixed",
          top: Math.max(16, targetRect.top + targetRect.height / 2 - 100),
          right: window.innerWidth - targetRect.left + cardGap,
        };
      default:
        return {
          position: "fixed",
          top: targetRect.top + targetRect.height + cardGap,
          left: targetRect.left,
        };
    }
  };

  // Build clip-path for the spotlight cutout
  const getClipPath = (): string => {
    if (!targetRect) {
      return "none";
    }

    const { top, left, width, height } = targetRect;
    const r = radius;

    // Create an inset polygon that cuts out the target area with rounded corners
    // Using clip-path with polygon creates a rectangular hole in the overlay
    return `polygon(
      0% 0%, 0% 100%,
      ${left}px 100%,
      ${left}px ${top + r}px,
      ${left + r}px ${top}px,
      ${left + width - r}px ${top}px,
      ${left + width}px ${top + r}px,
      ${left + width}px ${top + height - r}px,
      ${left + width - r}px ${top + height}px,
      ${left + r}px ${top + height}px,
      ${left}px ${top + height - r}px,
      ${left}px 100%,
      100% 100%, 100% 0%
    )`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[998] pointer-events-none" ref={overlayRef}>
        {/* Dark overlay with spotlight cutout */}
        <motion.div
          className="absolute inset-0 pointer-events-auto"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            clipPath: targetRect ? getClipPath() : "none",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        />

        {/* Highlight border around target */}
        {targetRect && (
          <motion.div
            className="absolute border-2 border-primary/50 pointer-events-none"
            style={{
              borderRadius: radius,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}

        {/* Tutorial card */}
        <motion.div
          className="pointer-events-auto"
          style={getCardPosition()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <TutorialCard
            step={step}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={onNext}
            onPrev={onPrev}
            onClose={onClose}
            waitingForAction={waitingForAction}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
