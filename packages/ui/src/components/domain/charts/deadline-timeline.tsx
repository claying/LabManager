import { ChartEmptyState } from "./chart-empty-state";

export interface DeadlineTimelineItem {
  date: string; // ISO date
  label: string;
  tone?: "default" | "warning" | "critical";
}

const TONE_COLOR: Record<NonNullable<DeadlineTimelineItem["tone"]>, string> = {
  default: "hsl(var(--primary))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
};

/** A compact horizontal "next N days" strip (SPEC_followup_2 section 15) — dates cluster into one marker per day so labels never overlap. */
export function DeadlineTimeline({
  items,
  days = 90,
  now = new Date(),
  emptyMessage = "No deadlines in the next 90 days",
}: {
  items: DeadlineTimelineItem[];
  days?: number;
  now?: Date;
  emptyMessage?: string;
}) {
  if (items.length === 0) return <ChartEmptyState message={emptyMessage} height={80} />;

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  const byDay = new Map<string, DeadlineTimelineItem[]>();
  for (const item of items) {
    const d = new Date(item.date);
    if (d < start || d > end) continue;
    const key = item.date.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  const totalMs = end.getTime() - start.getTime();
  const markers = [...byDay.entries()].map(([dateKey, dayItems]) => {
    const d = new Date(`${dateKey}T00:00:00Z`);
    const pct = ((d.getTime() - start.getTime()) / totalMs) * 100;
    const worstTone: DeadlineTimelineItem["tone"] = dayItems.some((i) => i.tone === "critical")
      ? "critical"
      : dayItems.some((i) => i.tone === "warning")
        ? "warning"
        : "default";
    return { dateKey, pct, items: dayItems, tone: worstTone };
  });

  // Month tick labels.
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getUTCDate() === 1 || cursor.getTime() === start.getTime()) {
      months.push({
        label: cursor.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }),
        pct: ((cursor.getTime() - start.getTime()) / totalMs) * 100,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return (
    <div className="pt-1">
      <div className="text-muted-foreground relative mb-1 h-4 text-[11px]">
        {months.map((m, i) => (
          <span key={i} className="absolute -translate-x-1/2" style={{ left: `${m.pct}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="bg-border relative h-px w-full">
        {markers.map((m) => (
          <div
            key={m.dateKey}
            className="border-background absolute -top-[5px] h-[11px] w-[11px] -translate-x-1/2 cursor-default rounded-full border-2"
            style={{ left: `${m.pct}%`, backgroundColor: TONE_COLOR[m.tone!] }}
            title={m.items.map((i) => i.label).join("\n")}
          />
        ))}
      </div>
    </div>
  );
}
