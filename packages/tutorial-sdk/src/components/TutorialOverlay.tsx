"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TutorialStep } from "../core/types";
import { TutorialCard } from "./TutorialCard";
import { TimeoutPrompt } from "./TimeoutPrompt";

interface OverlayProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  tutorialName?: string;
  finishButtonText?: string;
  otherTutorials?: Array<{ id: string; name: string; description: string }>;
  onStartTutorial?: (tutorialId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  waitingForAction: boolean;
  timeoutActive: boolean;
  timeoutRemaining: number;
  onDismissTimeout: () => void;
  onSkipStep: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_GAP = 16;
const CARD_WIDTH = 380;
const CARD_HEIGHT_ESTIMATE = 320;
const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 12;

function getClipPath(target: TargetRect | null): string {
  if (!target) return "none";
  const p = SPOTLIGHT_PADDING;
  const r = SPOTLIGHT_RADIUS;
  const t = target.top - p;
  const l = target.left - p;
  const b = target.top + target.height + p;
  const ri = target.left + target.width + p;
  return `polygon(
    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
    ${l}px ${t + r}px,
    ${l + r}px ${t}px,
    ${ri - r}px ${t}px,
    ${ri}px ${t + r}px,
    ${ri}px ${b - r}px,
    ${ri - r}px ${b}px,
    ${l + r}px ${b}px,
    ${l}px ${b - r}px,
    ${l}px ${t + r}px
  )`;
}

function calcCardPosition(
  target: TargetRect | null,
  side?: string
): { top: number; left: number } {
  if (!target) {
    // No target — center in viewport
    return {
      top: Math.max(40, (window.innerHeight - CARD_HEIGHT_ESTIMATE) / 2),
      left: Math.max(16, (window.innerWidth - CARD_WIDTH) / 2),
    };
  }

  const p = SPOTLIGHT_PADDING;
  let top = 0;
  let left = 0;

  switch (side) {
    case "top":
      top = target.top - p - CARD_HEIGHT_ESTIMATE - CARD_GAP;
      left = target.left + target.width / 2 - CARD_WIDTH / 2;
      break;
    case "left":
      top = target.top + target.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
      left = target.left - p - CARD_WIDTH - CARD_GAP;
      break;
    case "right":
      top = target.top + target.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
      left = target.left + target.width + p + CARD_GAP;
      break;
    case "bottom":
    default:
      top = target.top + target.height + p + CARD_GAP;
      left = target.left + target.width / 2 - CARD_WIDTH / 2;
      break;
  }

  // Clamp to viewport
  top = Math.max(16, Math.min(top, window.innerHeight - CARD_HEIGHT_ESTIMATE - 16));
  left = Math.max(16, Math.min(left, window.innerWidth - CARD_WIDTH - 16));

  return { top, left };
}

export function TutorialOverlay({
  step,
  currentStep,
  totalSteps,
  tutorialName,
  finishButtonText,
  otherTutorials,
  onStartTutorial,
  onNext,
  onPrev,
  onClose,
  waitingForAction,
  timeoutActive,
  timeoutRemaining,
  onDismissTimeout,
  onSkipStep,
}: OverlayProps) {
  const [target, setTarget] = useState<TargetRect | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Reset drag offset and clear target on step change
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    if (!step.selector) {
      setTarget(null);
    }
  }, [currentStep, step.selector]);

  // Native pointer-based drag
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Don't drag when clicking buttons or interactive elements
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "BUTTON" || tag === "A" || (e.target as HTMLElement).closest("button, a")) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(e: globalThis.PointerEvent) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setDragOffset({
        x: dragStartRef.current.offsetX + dx,
        y: dragStartRef.current.offsetY + dy,
      });
    }

    function handlePointerUp() {
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  // Track target element position
  const updateTarget = useCallback(() => {
    if (!step.selector) {
      setTarget(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTarget({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      // Scroll into view if needed
      if (
        rect.top < 0 ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.right > window.innerWidth
      ) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTarget(null);
    }
  }, [step.selector]);

  useEffect(() => {
    // Initial measurement with delay for DOM to settle
    const timeout = setTimeout(updateTarget, 100);

    // Track on scroll/resize
    function onLayout() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTarget);
    }

    window.addEventListener("scroll", onLayout, true);
    window.addEventListener("resize", onLayout);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onLayout, true);
      window.removeEventListener("resize", onLayout);
    };
  }, [updateTarget]);

  const side = step.position?.side || "bottom";
  const cardPos = calcCardPosition(target, side);

  // Apply viewport position overrides
  if (step.position?.anchor === "viewport" && step.position.x != null && step.position.y != null) {
    cardPos.left = step.position.x;
    cardPos.top = step.position.y;
  }

  return (
    <AnimatePresence>
      {/* Dark overlay with spotlight cutout — only when targeting an element */}
      {target && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 998,
            backgroundColor: `rgba(0, 0, 0, var(--tutorial-overlay-opacity, 0.65))`,
            clipPath: getClipPath(target),
            pointerEvents: "none",
          }}
        />
      )}

      {/* Target element highlight border */}
      {target && (
        <motion.div
          key="highlight"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: target.top - SPOTLIGHT_PADDING,
            left: target.left - SPOTLIGHT_PADDING,
            width: target.width + SPOTLIGHT_PADDING * 2,
            height: target.height + SPOTLIGHT_PADDING * 2,
            borderRadius: SPOTLIGHT_RADIUS,
            border: "2px solid var(--tutorial-primary, #3b82f6)",
            opacity: 0.5,
            zIndex: 998,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tutorial card — draggable via native pointer events */}
      <motion.div
        key="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        ref={cardRef}
        onPointerDown={handlePointerDown}
        style={{
          position: "fixed",
          top: cardPos.top + dragOffset.y,
          left: cardPos.left + dragOffset.x,
          zIndex: 999,
          width: CARD_WIDTH,
          maxWidth: "calc(100vw - 2rem)",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        <TutorialCard
          step={step}
          currentStep={currentStep}
          totalSteps={totalSteps}
          tutorialName={tutorialName}
          finishButtonText={finishButtonText}
          otherTutorials={otherTutorials}
          onStartTutorial={onStartTutorial}
          onNext={onNext}
          onPrev={onPrev}
          onClose={onClose}
          waitingForAction={waitingForAction}
        />

        {/* Timeout prompt */}
        {timeoutActive && (
          <TimeoutPrompt
            onShowAgain={onDismissTimeout}
            onSkip={onSkipStep}
            onEnd={onClose}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
