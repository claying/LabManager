import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useOneOnOneRhythm,
  useProjectLoadByPerson,
  useInteractionRhythm,
  useActionItems,
  usePeopleSupervisionSignals,
} from "@pi-os/repositories";
import { DEFAULT_OVERLOAD_THRESHOLD } from "@pi-os/domain";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { CompactBarChart } from "@pi-os/ui/components/domain/charts/compact-bar-chart";
import { ActivityHeatmap } from "@pi-os/ui/components/domain/charts/activity-heatmap";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { TopBar } from "../components/app-shell/topbar";

const NO_1ON1_ATTENTION_DAYS = 14;

export default function SupervisionPage() {
  const navigate = useNavigate();
  const { data: rhythm } = useOneOnOneRhythm();
  const { data: projectLoad } = useProjectLoadByPerson();
  const { data: interaction } = useInteractionRhythm(10);
  const { data: openActions } = useActionItems({ openOnly: true });
  const { data: signals } = usePeopleSupervisionSignals();

  const now = new Date();

  const overdueByPerson = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of openActions ?? []) {
      if (!item.due_date || !item.assignee) continue;
      if (new Date(item.due_date) >= now) continue;
      map.set(item.assignee.id, (map.get(item.assignee.id) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openActions]);

  const needsAttention = useMemo(() => {
    const rows: { personId: string; name: string; label: string }[] = [];
    for (const person of rhythm ?? []) {
      const signal = signals?.[person.personId];
      if (signal?.blocked)
        rows.push({ personId: person.personId, name: person.name, label: "blocked" });
      if (person.daysSinceOneOnOne !== null && person.daysSinceOneOnOne >= NO_1ON1_ATTENTION_DAYS) {
        rows.push({
          personId: person.personId,
          name: person.name,
          label: `${person.daysSinceOneOnOne}d since 1:1`,
        });
      }
      const overdue = overdueByPerson.get(person.personId) ?? 0;
      if (overdue > 0)
        rows.push({
          personId: person.personId,
          name: person.name,
          label: `${overdue} overdue action${overdue === 1 ? "" : "s"}`,
        });
      const load = projectLoad?.find((p) => p.personId === person.personId);
      if (load && load.leadCount + load.memberCount > DEFAULT_OVERLOAD_THRESHOLD) {
        rows.push({ personId: person.personId, name: person.name, label: "High load" });
      }
    }
    return rows;
  }, [rhythm, signals, overdueByPerson, projectLoad]);

  const rhythmData = (rhythm ?? []).map((r) => ({
    label: r.name,
    value: r.daysSinceOneOnOne ?? 0,
    color:
      r.daysSinceOneOnOne === null
        ? "hsl(var(--muted-foreground))"
        : r.daysSinceOneOnOne >= NO_1ON1_ATTENTION_DAYS
          ? "hsl(var(--warning))"
          : "hsl(var(--primary))",
    detail: r.daysSinceOneOnOne === null ? "never met" : "days since 1:1",
  }));

  const heatmapCells = (interaction ?? []).map((week) => ({
    key: week.weekStart,
    dateLabel: new Date(`${week.weekStart}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    total: week.oneOnOnes + week.meetings + week.updates,
    detail: [
      week.oneOnOnes > 0 ? `${week.oneOnOnes} one-on-one${week.oneOnOnes === 1 ? "" : "s"}` : null,
      week.meetings > 0 ? `${week.meetings} meeting${week.meetings === 1 ? "" : "s"}` : null,
      week.updates > 0 ? `${week.updates} update${week.updates === 1 ? "" : "s"}` : null,
    ].filter((s): s is string => Boolean(s)),
  }));

  return (
    <>
      <TopBar>
        <PageHeader title="Supervision" className="py-0" />
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-6">
          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Needs attention
            </h2>
            {needsAttention.length === 0 ? (
              <p className="text-muted-foreground py-3 text-sm">Nothing needs your attention.</p>
            ) : (
              <div className="divide-border border-border divide-y border-y">
                {needsAttention.map((row, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/people/${row.personId}`)}
                    className="hover:bg-muted/40 flex w-full items-center justify-between px-2 py-2 text-left text-sm"
                  >
                    <span className="text-foreground">{row.name}</span>
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Interaction rhythm
            </h2>
            <Card>
              <CardContent className="py-4">
                {heatmapCells.length === 0 || heatmapCells.every((c) => c.total === 0) ? (
                  <EmptyState title="No supervision history yet" className="py-4" />
                ) : (
                  <ActivityHeatmap cells={heatmapCells} />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Days since 1:1
            </h2>
            <Card>
              <CardContent className="py-4">
                <CompactBarChart
                  data={rhythmData}
                  onBarClick={(label) => {
                    const person = (rhythm ?? []).find((r) => r.name === label);
                    if (person) navigate(`/people/${person.personId}`);
                  }}
                  valueSuffix="d"
                />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Projects
            </h2>
            <div className="divide-border border-border divide-y border-y">
              {(projectLoad ?? []).map((p) => (
                <button
                  key={p.personId}
                  onClick={() => navigate(`/people/${p.personId}`)}
                  className="hover:bg-muted/40 flex w-full items-center justify-between px-2 py-2 text-left text-sm"
                >
                  <span className="text-foreground">{p.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.leadCount + p.memberCount} active · {p.leadCount} lead
                  </span>
                </button>
              ))}
              {(projectLoad ?? []).length === 0 && (
                <p className="text-muted-foreground py-3 text-sm">
                  No active project involvement yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
