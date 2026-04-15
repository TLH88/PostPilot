"use client";

import { useState } from "react";
import type { TutorialCardProps } from "../TutorialCard";
import { BorderBeam } from "../BorderBeam";

/**
 * Overview card template — matches the light mockup design.
 * Features: step pill, media slot, title, description, Next button, Skip link.
 */
export function OverviewCard({
  step,
  currentStep,
  totalSteps,
  tutorialName,
  finishButtonText,
  onNext,
  onPrev,
  onClose,
  waitingForAction,
  otherTutorials,
  onStartTutorial,
}: TutorialCardProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const [showTutorialList, setShowTutorialList] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--tutorial-bg, #ffffff)",
        color: "var(--tutorial-bg-foreground, #0a0a0a)",
        border: "1px solid var(--tutorial-border, #e5e7eb)",
        borderRadius: "var(--tutorial-radius, 12px)",
        overflow: "visible",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.25)",
      }}
    >
      <BorderBeam key={`beam-${currentStep}`} />

      {/* Header: tutorial name + step pill + close button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {tutorialName && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "var(--tutorial-muted-foreground, #6b7280)",
              }}
            >
              {tutorialName}:
            </span>
          )}
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--tutorial-primary, #3b82f6)",
              background: "color-mix(in srgb, var(--tutorial-primary, #3b82f6) 10%, transparent)",
              padding: "3px 10px",
              borderRadius: "999px",
            }}
          >
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "var(--tutorial-muted-foreground, #6b7280)",
            fontSize: "18px",
            lineHeight: 1,
          }}
          aria-label="Close tutorial"
        >
          ✕
        </button>
      </div>

      {/* Media slot */}
      {step.media && (
        <div
          style={{
            margin: "12px 16px 0",
            borderRadius: "8px",
            overflow: "hidden",
            aspectRatio: "16 / 9",
            background: "var(--tutorial-muted, #f3f4f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {step.media.type === "video" && step.media.src && (
            <video
              src={step.media.src}
              poster={step.media.poster}
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {step.media.type === "gif" && step.media.src && (
            <img
              src={step.media.src}
              alt={step.media.alt ?? "Tutorial step illustration"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {step.media.type === "animation" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "var(--tutorial-muted-foreground, #6b7280)",
                fontSize: "12px",
              }}
            >
              {/* LiveAnimationPlayer placeholder — Phase 2 */}
              Animation
            </div>
          )}
        </div>
      )}

      {/* Icon (if no media) */}
      {!step.media && step.icon && (
        <div
          style={{
            margin: "12px 16px 0",
            borderRadius: "8px",
            background: "var(--tutorial-muted, #f3f4f6)",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          {step.icon}
        </div>
      )}

      {/* Title + description */}
      <div style={{ padding: "16px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            margin: "0 0 6px",
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h3>
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            margin: 0,
            color: "var(--tutorial-muted-foreground, #6b7280)",
          }}
        >
          {step.content}
        </p>
      </div>

      {/* Waiting indicator */}
      {waitingForAction && (
        <div
          style={{
            padding: "0 16px 8px",
            fontSize: "12px",
            color: "var(--tutorial-primary, #3b82f6)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              border: "2px solid var(--tutorial-primary, #3b82f6)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "tutorial-spin 0.8s linear infinite",
            }}
          />
          Go ahead, try it!
        </div>
      )}

      {/* Navigation */}
      <div style={{ padding: "0 16px 12px" }}>
        <button
          onClick={onNext}
          disabled={waitingForAction}
          style={{
            width: "100%",
            padding: "10px 0",
            border: "none",
            borderRadius: "8px",
            background: waitingForAction
              ? "var(--tutorial-muted, #f3f4f6)"
              : "var(--tutorial-primary, #3b82f6)",
            color: waitingForAction
              ? "var(--tutorial-muted-foreground, #6b7280)"
              : "var(--tutorial-primary-foreground, #ffffff)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: waitingForAction ? "not-allowed" : "pointer",
            opacity: waitingForAction ? 0.6 : 1,
            transition: "opacity 0.15s, background 0.15s",
          }}
        >
          {isLast ? (finishButtonText ?? "Finish") : "Next →"}
        </button>

        {/* Back button */}
        {!isFirst && (
          <button
            onClick={onPrev}
            style={{
              width: "100%",
              padding: "6px 0",
              border: "none",
              background: "none",
              color: "var(--tutorial-muted-foreground, #6b7280)",
              fontSize: "12px",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Skip tutorial + View other tutorials */}
      <div style={{ textAlign: "center", paddingBottom: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--tutorial-muted-foreground, #6b7280)",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          Skip Tutorial
        </button>
        {isLast && otherTutorials && otherTutorials.length > 0 && (
          <button
            onClick={() => setShowTutorialList(!showTutorialList)}
            style={{
              background: "none",
              border: "none",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--tutorial-primary, #3b82f6)",
              cursor: "pointer",
            }}
          >
            {showTutorialList ? "Hide other tutorials" : "View other tutorials"}
          </button>
        )}
      </div>

      {/* Other tutorials — slides out from the right */}
      {showTutorialList && otherTutorials && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "100%",
            marginLeft: "8px",
            width: "280px",
            maxHeight: "100%",
            overflowY: "auto",
            background: "var(--tutorial-bg, #ffffff)",
            border: "1px solid var(--tutorial-border, #e5e7eb)",
            borderRadius: "var(--tutorial-radius, 12px)",
            padding: "12px",
            boxShadow: "0 10px 40px -8px rgba(0,0,0,0.2)",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--tutorial-muted-foreground, #6b7280)",
              marginBottom: "8px",
            }}
          >
            Other Tutorials
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {otherTutorials.map((t) => (
              <button
                key={t.id}
                onClick={() => onStartTutorial?.(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--tutorial-border, #e5e7eb)",
                  background: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--tutorial-muted, #f3f4f6)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--tutorial-primary, #3b82f6)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tutorial-bg-foreground, #0a0a0a)" }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--tutorial-muted-foreground, #6b7280)" }}>
                    {t.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes tutorial-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
