"use client";

/**
 * Gradient dots background for recharts line and bar charts.
 *
 * Renders three overlapping dot layers (blue → purple → green) that blend
 * left-to-right inside the chart plot area. Wrap your <ResponsiveContainer>
 * in a `relative` parent and place <ChartBackground /> as a sibling.
 *
 * Props control the pixel offsets so the dots align precisely with the
 * recharts cartesian grid, not the axis labels or legend.
 *
 * Usage:
 * ```tsx
 * <div className="relative">
 *   <ChartBackground top={10} bottom={25} left={55} right={20} />
 *   <ResponsiveContainer width="100%" height={250}>
 *     <LineChart ...>
 *   </ResponsiveContainer>
 * </div>
 * ```
 */

interface ChartBackgroundProps {
  /** Pixels from the top of the container to the plot area top (chart margin-top). Default 10. */
  top?: number;
  /** Pixels from the bottom of the container to the plot area bottom (x-axis labels + legend). Default 25. */
  bottom?: number;
  /** Pixels from the left of the container to the plot area left (YAxis width + margin). Default 55. */
  left?: number;
  /** Pixels from the right of the container to the plot area right (chart margin-right). Default 20. */
  right?: number;
}

export function ChartBackground({
  top = 10,
  bottom = 25,
  left = 55,
  right = 20,
}: ChartBackgroundProps) {
  return (
    <div
      className="absolute overflow-hidden rounded-sm pointer-events-none"
      style={{ top, bottom, left, right }}
    >
      {/* Blue dots layer (left side) */}
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "linear-gradient(to right, black, transparent 60%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, black, transparent 60%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in" as string,
        }}
      />
      {/* Purple dots layer (center) */}
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: "radial-gradient(circle, #8b5cf6 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "8px 8px",
          maskImage:
            "linear-gradient(to right, transparent 20%, black 50%, transparent 80%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 20%, black 50%, transparent 80%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in" as string,
        }}
      />
      {/* Green dots layer (right side) */}
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: "radial-gradient(circle, #22c55e 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "linear-gradient(to right, transparent 40%, black), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 40%, black), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in" as string,
        }}
      />
    </div>
  );
}
