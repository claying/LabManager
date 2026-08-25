import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { ChartEmptyState } from "./chart-empty-state";

/** A single trend line over time — for counts, never a fabricated "velocity" metric. */
export function TrendChart({
  data,
  xKey,
  yKey,
  yLabel,
  onPointClick,
  emptyMessage = "No activity yet",
  height = 100,
  color = "hsl(var(--primary))",
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  yLabel: string;
  onPointClick?: (xValue: string) => void;
  emptyMessage?: string;
  height?: number;
  color?: string;
}) {
  const hasData = data.some((row) => Number(row[yKey] ?? 0) > 0);
  if (!hasData) return <ChartEmptyState message={emptyMessage} height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        onClick={(state) => {
          if (onPointClick && state?.activeLabel !== undefined)
            onPointClick(String(state.activeLabel));
        }}
      >
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          content={({ active, label, payload }) => (
            <ChartTooltip
              active={active}
              label={String(label)}
              rows={[{ label: yLabel, value: Number(payload?.[0]?.value ?? 0) }]}
            />
          )}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 4, style: { cursor: onPointClick ? "pointer" : undefined } }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
