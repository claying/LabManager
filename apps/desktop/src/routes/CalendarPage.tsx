import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useDashboardData, useVenueCycles } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { Tabs, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import {
  DeadlineTimeline,
  type DeadlineTimelineItem,
} from "@pi-os/ui/components/domain/charts/deadline-timeline";
import { TopBar } from "../components/app-shell/topbar";
import { useQuickActions } from "../lib/quick-actions-context";

interface CalendarItem {
  date: string;
  label: string;
  tone: "default" | "warning" | "critical";
  href?: string;
}

function toneFor(daysAway: number): CalendarItem["tone"] {
  if (daysAway < 0) return "critical";
  if (daysAway <= 7) return "warning";
  return "default";
}

const VENUE_DEADLINE_FIELDS: {
  key: keyof NonNullable<ReturnType<typeof useVenueCycles>["data"]>[number];
  suffix: string;
}[] = [
  { key: "abstract_deadline", suffix: "abstract" },
  { key: "submission_deadline", suffix: "submission" },
  { key: "rebuttal_start", suffix: "rebuttal starts" },
  { key: "rebuttal_end", suffix: "rebuttal ends" },
  { key: "notification_date", suffix: "notification" },
  { key: "camera_ready_date", suffix: "camera-ready" },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const { data } = useDashboardData();
  const { data: cycles } = useVenueCycles({ upcomingOnly: true });
  const [view, setView] = useState<"timeline" | "month">("timeline");
  const { openNewVenueCycle } = useQuickActions();
  const now = useMemo(() => new Date(), []);

  const items = useMemo<CalendarItem[]>(() => {
    const list: CalendarItem[] = [];
    for (const m of data?.openMilestones ?? []) {
      if (!m.due_date) continue;
      const days = Math.floor((new Date(m.due_date).getTime() - now.getTime()) / 86400000);
      list.push({
        date: m.due_date,
        label: `${m.project_title} — ${m.title}`,
        tone: toneFor(days),
        href: `/projects/${m.project_id}`,
      });
    }
    for (const p of data?.publications ?? []) {
      if (!p.submission_deadline) continue;
      const days = Math.floor(
        (new Date(p.submission_deadline).getTime() - now.getTime()) / 86400000,
      );
      list.push({
        date: p.submission_deadline,
        label: `${p.title} — submission`,
        tone: toneFor(days),
        href: `/publications/${p.id}`,
      });
    }
    for (const g of data?.grants ?? []) {
      if (!g.deadline) continue;
      const days = Math.floor((new Date(g.deadline).getTime() - now.getTime()) / 86400000);
      list.push({
        date: g.deadline,
        label: `${g.title} — deadline`,
        tone: toneFor(days),
        href: "/grants",
      });
    }
    for (const cycle of cycles ?? []) {
      for (const field of VENUE_DEADLINE_FIELDS) {
        const value = cycle[field.key] as string | null;
        if (!value) continue;
        const days = Math.floor((new Date(value).getTime() - now.getTime()) / 86400000);
        list.push({
          date: value,
          label: `${cycle.venue.short_name ?? cycle.venue.name} ${cycle.cycle_label} ${field.suffix}`,
          tone: toneFor(days),
        });
      }
    }
    return list
      .filter((i) => new Date(i.date) >= new Date(now.getTime() - 86400000))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [data, cycles, now]);

  const timelineItems: DeadlineTimelineItem[] = items.map((i) => ({
    date: i.date,
    label: i.label,
    tone: i.tone,
  }));

  const byMonth = useMemo(() => {
    const groups = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = new Date(item.date).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return groups;
  }, [items]);

  return (
    <>
      <TopBar>
        <PageHeader
          title="Calendar"
          className="py-0"
          actions={
            <Button size="sm" onClick={openNewVenueCycle}>
              <Plus className="h-3.5 w-3.5" /> Venue cycle
            </Button>
          }
        />
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          <DeadlineTimeline items={timelineItems} />

          <Tabs value={view} onValueChange={(v) => setView(v as "timeline" | "month")}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {items.length === 0 ? (
            <EmptyState
              title="Nothing coming up"
              description="No deadlines on record."
              className="mt-8"
            />
          ) : view === "timeline" ? (
            <div className="space-y-5">
              {[...byMonth.entries()].map(([month, monthItems]) => (
                <section key={month}>
                  <h2 className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                    {month}
                  </h2>
                  <div className="divide-border border-border divide-y border-y">
                    {monthItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => item.href && navigate(item.href)}
                        className="hover:bg-muted/40 flex w-full items-center gap-3 px-2 py-2 text-left text-sm"
                        disabled={!item.href}
                      >
                        <span className="text-muted-foreground w-6 shrink-0 tabular-nums">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            day: "2-digit",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span
                          className={
                            item.tone === "critical"
                              ? "text-destructive"
                              : item.tone === "warning"
                                ? "text-warning"
                                : "text-foreground"
                          }
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <MonthGrid items={items} now={now} onSelect={(href) => href && navigate(href)} />
          )}
        </div>
      </main>
    </>
  );
}

function MonthGrid({
  items,
  now,
  onSelect,
}: {
  items: CalendarItem[];
  now: Date;
  onSelect: (href?: string) => void;
}) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startOffset = (firstDay.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const byDay = new Map<number, CalendarItem[]>();
  for (const item of items) {
    const d = new Date(item.date);
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      const list = byDay.get(d.getUTCDate()) ?? [];
      list.push(item);
      byDay.set(d.getUTCDate(), list);
    }
  }

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="text-foreground mb-2 text-sm font-medium">
        {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayItems = day ? byDay.get(day) : undefined;
          return (
            <div key={i} className="border-border min-h-16 rounded-md border p-1 text-xs">
              {day && (
                <>
                  <span className="text-muted-foreground">{day}</span>
                  {dayItems?.slice(0, 2).map((item, j) => (
                    <button
                      key={j}
                      onClick={() => onSelect(item.href)}
                      title={item.label}
                      className={`mt-0.5 block w-full truncate rounded px-1 text-left ${
                        item.tone === "critical"
                          ? "bg-destructive/10 text-destructive"
                          : item.tone === "warning"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  {dayItems && dayItems.length > 2 && (
                    <span className="text-muted-foreground">+{dayItems.length - 2} more</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
