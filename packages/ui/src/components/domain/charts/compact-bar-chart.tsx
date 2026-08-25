import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { ChartEmptyState } from "./chart-empty-state";

export interface CompactBarDatum {
  label: string;
  value: number;
  color?: string;
  /** Extra text shown after the value in the tooltip, e.g. "9d overdue". */
  detail?: string;
}

/**
 * Horizontal bars — the default for anything with long text labels (stage
 * names, people's names) per SPEC_followup_2 section 30 rule "prefer
 * horizontal bars because stage names are long."
 */
export function CompactBarChart({
  data,
  onBarClick,
  emptyMessage = "No data yet",
  height,
  color = "hsl(var(--primary))",
  valueSuffix = "",
}: {
  data: CompactBarDatum[];
  onBarClick?: (label: string) => void;
  emptyMessage?: string;
  height?: number;
  color?: string;
  valueSuffix?: string;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <ChartEmptyState message={emptyMessage} height={height ?? 120} />;
  }

  const rowHeight = 28;
  const chartHeight = height ?? Math.max(80, data.length * rowHeight);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
        barCategoryGap={6}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as CompactBarDatum | undefined;
            if (!d) return null;
            return (
              <ChartTooltip
                active={active}
                label={d.label}
                rows={[{ label: d.detail ?? "count", value: `${d.value}${valueSuffix}` }]}
              />
            );
          }}
        />
        <Bar
          dataKey="value"
          radius={[0, 3, 3, 0]}
          maxBarSize={16}
          onClick={
            onBarClick ? (d) => onBarClick((d as unknown as CompactBarDatum).label) : undefined
          }
          className={onBarClick ? "cursor-pointer" : undefined}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            formatter={(v: number) => `${v}${valueSuffix}`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
