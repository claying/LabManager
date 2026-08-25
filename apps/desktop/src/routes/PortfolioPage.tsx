import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PROJECT_STAGE_LABELS } from "@pi-os/types";
import {
  useStageDistribution,
  useStageAging,
  useProjectMovement,
  useHealthTrend,
  useDeadlineLoad,
  useSubmissionLoad,
} from "@pi-os/repositories";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { CompactBarChart } from "@pi-os/ui/components/domain/charts/compact-bar-chart";
import { TrendChart } from "@pi-os/ui/components/domain/charts/trend-chart";
import { StackedBarChart } from "@pi-os/ui/components/domain/charts/stacked-bar-chart";
import { Tabs, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { TopBar } from "../components/app-shell/topbar";

const PERIODS = [
  { label: "8 weeks", weeks: 8 },
  { label: "3 months", weeks: 13 },
  { label: "6 months", weeks: 26 },
  { label: "1 year", weeks: 52 },
] as const;

const HEALTH_SERIES = [
  { key: "healthy", label: "Healthy", color: "hsl(var(--success))" },
  { key: "attention", label: "Attention", color: "hsl(var(--warning))" },
  { key: "at_risk", label: "At risk", color: "hsl(24 90% 55%)" },
  { key: "stalled", label: "Stalled", color: "hsl(var(--destructive))" },
];

const DEADLINE_SERIES = [
  { key: "paper", label: "Papers", color: "hsl(var(--primary))" },
  { key: "milestone", label: "Milestones", color: "hsl(var(--muted-foreground))" },
  { key: "grant", label: "Grants", color: "hsl(var(--warning))" },
];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div>
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [periodIdx, setPeriodIdx] = useState(1); // default 3 months
  const weeks = PERIODS[periodIdx]!.weeks;

  const { data: distribution } = useStageDistribution();
  const { data: aging } = useStageAging();
  const { data: movement } = useProjectMovement(weeks);
  const { data: healthTrend } = useHealthTrend(weeks);
  const { data: deadlineLoad } = useDeadlineLoad(12);
  const { data: submissionLoad } = useSubmissionLoad(4);

  const distributionData = useMemo(
    () =>
      (distribution ?? []).map((d) => ({
        label: PROJECT_STAGE_LABELS[d.stage],
        value: d.count,
        stage: d.stage,
      })),
    [distribution],
  );
  const agingData = useMemo(
    () =>
      (aging ?? [])
        .filter((d) => d.sampleCount > 0)
        .map((d) => ({
          label: PROJECT_STAGE_LABELS[d.stage],
          value: d.medianDays,
          stage: d.stage,
          detail: "median days",
        })),
    [aging],
  );
  const movementData = useMemo(
    () => (movement ?? []).map((m) => ({ week: m.weekStart.slice(5), count: m.count })),
    [movement],
  );
  const healthData = useMemo(
    () => (healthTrend ?? []).map((h) => ({ week: h.weekStart.slice(5), ...h.counts })),
    [healthTrend],
  );
  const deadlineData = useMemo(
    () => (deadlineLoad ?? []).map((d) => ({ week: d.weekStart.slice(5), ...d.byKind })),
    [deadlineLoad],
  );
  const submissionData = useMemo(
    () =>
      (submissionLoad ?? []).map((s) => ({
        label: new Date(`${s.monthStart}T00:00:00Z`).toLocaleDateString(undefined, {
          month: "short",
          timeZone: "UTC",
        }),
        value: s.count,
      })),
    [submissionLoad],
  );

  function goToStage(label: string) {
    const stage =
      (distribution ?? []).find((d) => PROJECT_STAGE_LABELS[d.stage] === label)?.stage ??
      (aging ?? []).find((d) => PROJECT_STAGE_LABELS[d.stage] === label)?.stage;
    if (stage) navigate(`/projects?stage=${stage}`);
  }

  return (
    <>
      <TopBar>
        <PageHeader title="Portfolio" className="py-0" />
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex justify-end">
          <Tabs value={String(periodIdx)} onValueChange={(v) => setPeriodIdx(Number(v))}>
            <TabsList>
              {PERIODS.map((p, i) => (
                <TabsTrigger key={p.label} value={String(i)}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Project flow"
            subtitle="Where projects sit right now — click a stage to inspect"
          >
            <CompactBarChart data={distributionData} onBarClick={goToStage} />
          </ChartCard>

          <ChartCard
            title="Stage aging"
            subtitle="Median days spent in each stage — click to inspect"
          >
            <CompactBarChart
              data={agingData}
              onBarClick={goToStage}
              valueSuffix="d"
              color="hsl(var(--muted-foreground))"
            />
          </ChartCard>

          <ChartCard title="Project movement" subtitle="Stage transitions per week">
            <TrendChart data={movementData} xKey="week" yKey="count" yLabel="transitions" />
          </ChartCard>

          <ChartCard title="Health trend" subtitle="Active projects by health, per week">
            <StackedBarChart data={healthData} xKey="week" series={HEALTH_SERIES} />
          </ChartCard>

          <ChartCard
            title="Upcoming load"
            subtitle="Deadlines by week, next 12 weeks — click to open Calendar"
          >
            <StackedBarChart
              data={deadlineData}
              xKey="week"
              series={DEADLINE_SERIES}
              onBarClick={() => navigate("/calendar")}
            />
          </ChartCard>

          <ChartCard
            title="Submission load"
            subtitle="Papers by target month — is too much converging on one deadline?"
          >
            <CompactBarChart data={submissionData} onBarClick={() => navigate("/publications")} />
          </ChartCard>
        </div>
      </main>
    </>
  );
}
