import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { ChartEmptyState } from "./chart-empty-state";

export interface StackedSeries {
  key: string;
  label: string;
  color: string;
}

/** Vertical stacked/grouped bars over time — never combines incomparable event types into one fake score. */
export function StackedBarChart({
  data,
  xKey,
  series,
  onBarClick,
  emptyMessage = "No activity yet",
  height = 140,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: StackedSeries[];
  onBarClick?: (xValue: string) => void;
  emptyMessage?: string;
  height?: number;
}) {
  const hasData = data.some((row) => series.some((s) => Number(row[s.key] ?? 0) > 0));
  if (!hasData) return <ChartEmptyState message={emptyMessage} height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barCategoryGap={4}>
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          content={({ active, label, payload }) => (
            <ChartTooltip
              active={active}
              label={String(label)}
              rows={(payload ?? [])
                .filter((p) => Number(p.value) > 0)
                .map((p) => ({
                  label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey),
                  value: Number(p.value),
                  color: p.color,
                }))}
            />
          )}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="stack"
            fill={s.color}
            radius={i === series.length - 1 ? [2, 2, 0, 0] : undefined}
            maxBarSize={28}
            onClick={
              onBarClick
                ? (d) => onBarClick(String((d as unknown as Record<string, unknown>)[xKey]))
                : undefined
            }
            className={onBarClick ? "cursor-pointer" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
