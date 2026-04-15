"use client";

import { useEffect, useRef, useState } from "react";

interface BorderBeamProps {
  /** Width of the light beam in pixels */
  width?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Border width in pixels */
  borderWidth?: number;
}

/**
 * Animated border beam effect for tutorial cards.
 * Creates a glowing light that travels along the card border.
 * Uses the tutorial primary color via CSS variable.
 */
export function BorderBeam({
  width = 150,
  duration = 8,
  borderWidth = 2,
}: BorderBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    const update = () => {
      setDimensions({ w: el.offsetWidth, h: el.offsetHeight });
    };

    const timeout = setTimeout(update, 50);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const { w, h } = dimensions;
  if (w === 0 || h === 0) {
    return <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
  }

  // Add padding around the SVG for the glow filter
  const pad = 10;
  const svgW = w + pad * 2;
  const svgH = h + pad * 2;

  // Build path inset by half stroke width, offset by padding
  const r = 12;
  const half = borderWidth / 2;
  const x1 = pad + half;
  const y1 = pad + half;
  const x2 = pad + w - half;
  const y2 = pad + h - half;
  const cr = Math.max(r - half, 0);

  const path = [
    `M ${x1 + cr} ${y1}`,
    `H ${x2 - cr}`,
    `Q ${x2} ${y1} ${x2} ${y1 + cr}`,
    `V ${y2 - cr}`,
    `Q ${x2} ${y2} ${x2 - cr} ${y2}`,
    `H ${x1 + cr}`,
    `Q ${x1} ${y2} ${x1} ${y2 - cr}`,
    `V ${y1 + cr}`,
    `Q ${x1} ${y1} ${x1 + cr} ${y1}`,
  ].join(" ");

  const iw = w - borderWidth;
  const ih = h - borderWidth;
  const pathLength = 2 * (iw + ih) + 2 * Math.PI * cr;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: -pad,
        left: -pad,
        width: svgW,
        height: svgH,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        fill="none"
        style={{ display: "block" }}
      >
        {/* Animated beam */}
        <path
          d={path}
          stroke="var(--tutorial-primary, #3b82f6)"
          strokeWidth={borderWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${width} ${pathLength}`}
          style={{
            animation: `tutorial-border-beam ${duration}s linear infinite`,
            strokeDashoffset: pathLength,
            filter: "drop-shadow(0 0 6px var(--tutorial-primary, #3b82f6))",
          }}
        />
      </svg>
      <style>{`
        @keyframes tutorial-border-beam {
          0% { stroke-dashoffset: ${pathLength}; }
          100% { stroke-dashoffset: ${-width}; }
        }
      `}</style>
    </div>
  );
}
