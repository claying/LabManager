import { ChartEmptyState } from "./chart-empty-state";

export interface HeatmapCell {
  /** e.g. a week-start date or day date. */
  key: string;
  /** Short label for the cell's hover title, e.g. "Aug 18". */
  dateLabel: string;
  total: number;
  /** Extra lines appended to the hover title, e.g. ["1 one-on-one", "2 updates"]. */
  detail?: string[];
}

/**
 * A GitHub-style intensity strip — supervision cadence, explicitly not
 * framed as productivity (SPEC_followup_2 section 26).
 */
export function ActivityHeatmap({
  cells,
  emptyMessage = "No supervision history yet",
}: {
  cells: HeatmapCell[];
  emptyMessage?: string;
}) {
  const max = Math.max(...cells.map((c) => c.total), 0);
  if (max === 0) return <ChartEmptyState message={emptyMessage} height={40} />;

  return (
    <div className="flex gap-1">
      {cells.map((cell) => {
        const intensity = cell.total === 0 ? 0 : Math.min(1, cell.total / max);
        return (
          <div
            key={cell.key}
            className="h-5 flex-1 rounded-sm"
            style={{
              backgroundColor: intensity === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
              opacity: intensity === 0 ? 1 : 0.25 + intensity * 0.75,
            }}
            title={[cell.dateLabel, ...(cell.detail ?? [])].join("\n")}
          />
        );
      })}
    </div>
  );
}
