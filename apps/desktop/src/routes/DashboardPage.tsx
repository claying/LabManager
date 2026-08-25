import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { PROJECT_STAGE_LABELS } from "@pi-os/types";
import {
  useDashboardData,
  useThisWeekSummary,
  useInbox,
  usePeopleSupervisionSignals,
  useActivityByWeek,
  useVenueCycles,
  useStageDistribution,
} from "@pi-os/repositories";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { Button } from "@pi-os/ui/components/button";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import { Sparkline } from "@pi-os/ui/components/domain/charts/sparkline";
import { useActiveWorkspace } from "../lib/workspace-context";
import { TopBar } from "../components/app-shell/topbar";
import { QuickCreateMenu } from "../components/app-shell/quick-create-menu";
import { maybeSendDeadlineDigest } from "../lib/native/notifications";

const VENUE_DEADLINE_KEYS = ["abstract_deadline", "submission_deadline"] as const;

const MILESTONE_DUE_SOON_DAYS = 7;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { currentPerson } = useActiveWorkspace();
  const { data, isLoading } = useDashboardData();
  const { data: week } = useThisWeekSummary();
  const { data: inboxItems } = useInbox();
  const { data: signals } = usePeopleSupervisionSignals();
  const { data: activity } = useActivityByWeek(8);
  const { data: venueCycles } = useVenueCycles({ upcomingOnly: true });
  const { data: stageDistribution } = useStageDistribution();
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!data) return;
    let overdue = 0;
    let dueSoon = 0;
    for (const m of data.openMilestones) {
      if (!m.due_date) continue;
      const days = Math.floor(
        (new Date(m.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) overdue += 1;
      else if (days <= MILESTONE_DUE_SOON_DAYS) dueSoon += 1;
    }
    void maybeSendDeadlineDigest({
      overdueMilestoneCount: overdue,
      dueSoonMilestoneCount: dueSoon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const activeProjectCount = data?.projects.filter((p) => !p.archived).length ?? 0;
  const activePeople = data?.people.filter((p) => p.status === "active") ?? [];
  const deadlineCount = (inboxItems ?? []).filter((i) => i.group === "due_soon").length;
  const needsYou = (inboxItems ?? []).slice(0, 5);
  const displayName = currentPerson?.name.split(" ")[0] ?? "there";

  const peopleWithSignal = activePeople
    .filter((person) => person.id !== currentPerson?.id)
    .map((person) => ({ person, signal: signals?.[person.id] }))
    .filter(
      ({ signal }) =>
        signal &&
        (signal.blocked || signal.noOneOnOneDays !== null || signal.activeProjectCount > 0),
    )
    .sort((a, b) => {
      const weight = (s?: { blocked: boolean; noOneOnOneDays: number | null }) =>
        s?.blocked ? 2 : s?.noOneOnOneDays !== null ? 1 : 0;
      return weight(b.signal) - weight(a.signal);
    })
    .slice(0, 6);

  const activitySparkline = (activity ?? []).map((w) =>
    Object.values(w.counts).reduce((a, b) => a + b, 0),
  );

  const nextDeadline = (venueCycles ?? [])
    .flatMap((cycle) =>
      VENUE_DEADLINE_KEYS.map((key) => cycle[key])
        .filter((d): d is string => Boolean(d) && new Date(d as string) >= now)
        .map((d) => ({ date: d, cycle })),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const nextDeadlineDays = nextDeadline
    ? Math.floor((new Date(nextDeadline.date).getTime() - now.getTime()) / 86400000)
    : null;

  const flowData = (stageDistribution ?? []).filter((d) => d.count > 0);
  const flowTotal = flowData.reduce((sum, d) => sum + d.count, 0);

  if (!isLoading && data && data.projects.length === 0 && data.people.length <= 1) {
    return (
      <>
        <TopBar>
          <p className="text-foreground text-sm font-medium">
            {greeting()}, {displayName}
          </p>
        </TopBar>
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-8">
          <EmptyState
            icon={FlaskConical}
            title="Welcome to your lab"
            description="Create your first project to start tracking progress, milestones, and updates."
            action={
              <Button asChild>
                <Link to="/projects?new=project">New Project</Link>
              </Button>
            }
            className="max-w-md"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar>
        <p className="text-foreground text-sm font-medium">
          {greeting()}, {displayName}
        </p>
      </TopBar>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex items-center justify-between">
            {isLoading ? (
              <Skeleton className="h-5 w-64" />
            ) : (
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{activeProjectCount}</span> projects
                {"  "}
                <span className="text-foreground font-medium">{activePeople.length}</span> people
                {"  "}
                <span className="text-foreground font-medium">{deadlineCount}</span> deadlines
              </p>
            )}
            <QuickCreateMenu />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {needsYou.length > 0 && (
                <Section title="Needs you" more={{ href: "/inbox", label: "Inbox" }}>
                  {needsYou.map((item) => (
                    <Link
                      key={item.key}
                      to={item.entityType === "decision" ? "/inbox" : item.href}
                      className="hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm"
                    >
                      <span className="text-foreground truncate">{item.title}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">{item.context}</span>
                    </Link>
                  ))}
                </Section>
              )}

              {week && (week.updates > 0 || week.decisions > 0 || week.milestones > 0) && (
                <Section title="This week" more={{ href: "/review", label: "Review" }}>
                  <div className="flex items-center justify-between gap-6 py-1.5 text-sm">
                    <div className="flex gap-6">
                      {week.updates > 0 && (
                        <Stat
                          count={week.updates}
                          label={`update${week.updates === 1 ? "" : "s"}`}
                        />
                      )}
                      {week.decisions > 0 && (
                        <Stat
                          count={week.decisions}
                          label={`decision${week.decisions === 1 ? "" : "s"}`}
                        />
                      )}
                      {week.milestones > 0 && (
                        <Stat
                          count={week.milestones}
                          label={`milestone${week.milestones === 1 ? "" : "s"}`}
                        />
                      )}
                    </div>
                    {activitySparkline.some((v) => v > 0) && (
                      <Sparkline values={activitySparkline} width={72} height={18} />
                    )}
                  </div>
                </Section>
              )}

              {nextDeadline && (
                <Section title="Next deadline" more={{ href: "/calendar", label: "Calendar" }}>
                  <div className="flex items-center justify-between px-1 py-1.5 text-sm">
                    <span className="text-foreground">
                      {nextDeadline.cycle.venue.short_name ?? nextDeadline.cycle.venue.name}{" "}
                      {nextDeadline.cycle.cycle_label}
                    </span>
                    <span className="text-muted-foreground text-xs">{nextDeadlineDays}d</span>
                  </div>
                </Section>
              )}

              {flowData.length > 0 && (
                <Section title="Research flow" more={{ href: "/portfolio", label: "Portfolio" }}>
                  <div className="py-2">
                    <div className="flex h-2 overflow-hidden rounded-full">
                      {flowData.map((d, i) => (
                        <div
                          key={d.stage}
                          title={`${PROJECT_STAGE_LABELS[d.stage]}: ${d.count}`}
                          className={i % 2 === 0 ? "bg-primary" : "bg-primary/50"}
                          style={{ width: `${(d.count / flowTotal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      {flowData
                        .map((d) => `${PROJECT_STAGE_LABELS[d.stage]} ${d.count}`)
                        .join(" · ")}
                    </p>
                  </div>
                </Section>
              )}

              {peopleWithSignal.length > 0 && (
                <Section title="People" more={{ href: "/people", label: "People" }}>
                  {peopleWithSignal.map(({ person, signal }) => (
                    <Link
                      key={person.id}
                      to={`/people/${person.id}`}
                      className="hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <PersonAvatar name={person.name} avatarUrl={person.avatar_url} size="sm" />
                        <span className="text-foreground truncate">{person.name}</span>
                      </span>
                      <span
                        className={`shrink-0 text-xs ${signal?.blocked ? "text-destructive" : signal?.noOneOnOneDays !== null && signal?.noOneOnOneDays !== undefined ? "text-warning" : "text-muted-foreground"}`}
                      >
                        {signal?.blocked
                          ? "blocked"
                          : signal?.noOneOnOneDays !== null && signal?.noOneOnOneDays !== undefined
                            ? `${signal.noOneOnOneDays}d since 1:1`
                            : `${signal?.activeProjectCount} project${signal?.activeProjectCount === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {title}
        </h2>
        {more && (
          <Link to={more.href} className="text-muted-foreground hover:text-foreground text-xs">
            {more.label} →
          </Link>
        )}
      </div>
      <div className="divide-border border-border divide-y border-y">{children}</div>
    </section>
  );
}

function Stat({ count, label }: { count: number; label: string }) {
  return (
    <span>
      <span className="text-foreground font-medium">{count}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
