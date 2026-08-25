/**
 * Tiny inline trend indicator — no axes, no labels. Hover a bar for its
 * exact value. Never use this where exact values matter more than the
 * shape of the trend (SPEC_followup_2 section 39).
 */
export function Sparkline({
  values,
  labels,
  width = 80,
  height = 20,
  color = "hsl(var(--primary))",
}: {
  values: number[];
  /** Optional per-bar labels for the hover title, e.g. "Aug 10: 3". */
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length === 0 || values.every((v) => v === 0)) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const max = Math.max(...values, 1);
  const barWidth = width / values.length;
  const gap = Math.min(2, barWidth * 0.2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {values.map((v, i) => {
        const barHeight = Math.max(1, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * barWidth + gap / 2}
            y={height - barHeight}
            width={Math.max(1, barWidth - gap)}
            height={barHeight}
            fill={color}
            opacity={v === 0 ? 0.15 : 0.85}
            rx={1}
          >
            {labels?.[i] && <title>{labels[i]}</title>}
          </rect>
        );
      })}
    </svg>
  );
}
