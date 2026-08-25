import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Github,
  Globe,
  HardDrive,
  MessageSquare,
  PauseCircle,
  Pencil,
  Plus,
  Scale,
  TrendingUp,
  UserPlus,
  Video,
} from "lucide-react";
import { calculateProjectAttention } from "@pi-os/domain";
import type { TimelineEventType, ResearchQuestionStatus, HypothesisStatus } from "@pi-os/types";
import { HYPOTHESIS_STATUSES, HYPOTHESIS_STATUS_LABELS } from "@pi-os/types";
import {
  useMeetings,
  useMilestones,
  useProject,
  useProjectUpdates,
  usePeople,
  usePublications,
  useProjectTimeline,
  useDecisionRequests,
  useResearchQuestions,
  useHypotheses,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pi-os/ui/components/tabs";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import {
  HealthBadge,
  MilestoneStatusBadge,
  PriorityBadge,
  PublicationStatusBadge,
  StageBadge,
} from "@pi-os/ui/components/domain/status-badge";
import { useActiveWorkspace } from "../lib/workspace-context";
import { openExternalLink } from "../lib/native/links";
import { TopBar } from "../components/app-shell/topbar";
import { WeeklyUpdateDialog } from "../components/projects/weekly-update-dialog";
import { MilestoneDialog } from "../components/projects/milestone-dialog";
import { ProjectMembersDialog } from "../components/projects/project-members-dialog";
import { ProjectFormDialog } from "../components/projects/project-form-dialog";
import { MeetingFormDialog } from "../components/meetings/meeting-form-dialog";
import { PublicationFormDialog } from "../components/publications/publication-form-dialog";
import { LinkedFiles } from "../components/shared/linked-files";
import { GitInfoCard } from "../components/projects/git-info-card";
import { DecisionRequestPanel } from "../components/decisions/decision-request-panel";
import { ResearchQuestionPanel } from "../components/research/research-question-panel";
import { HypothesisPanel } from "../components/research/hypothesis-panel";
import { CompactBarChart } from "@pi-os/ui/components/domain/charts/compact-bar-chart";

const QUESTION_STATUS_ICON: Record<ResearchQuestionStatus, typeof Circle> = {
  open: Circle,
  investigating: CircleDot,
  answered: CheckCircle2,
  parked: PauseCircle,
};

const HYPOTHESIS_STATUS_ICON: Record<HypothesisStatus, typeof Circle> = {
  untested: Circle,
  testing: CircleDot,
  supported: CheckCircle2,
  mixed: CircleDot,
  not_supported: Circle,
};

const HYPOTHESIS_STATUS_COLOR: Record<HypothesisStatus, string> = {
  untested: "hsl(var(--muted-foreground))",
  testing: "hsl(var(--warning))",
  supported: "hsl(var(--success))",
  mixed: "hsl(var(--warning))",
  not_supported: "hsl(var(--destructive))",
};

type TimelineFilter = "all" | "update" | "meeting" | "decision" | "milestone";

const TIMELINE_FILTERS: { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "update", label: "Updates" },
  { value: "meeting", label: "Meetings" },
  { value: "decision", label: "Decisions" },
  { value: "milestone", label: "Milestones" },
];

function matchesFilter(type: TimelineEventType, filter: TimelineFilter): boolean {
  if (filter === "all") return true;
  if (filter === "milestone") return type === "milestone_created" || type === "milestone_completed";
  if (filter === "update") return type === "update";
  if (filter === "meeting") return type === "meeting";
  if (filter === "decision") return type === "decision";
  return true;
}

const TIMELINE_ICON: Record<TimelineEventType, typeof Clock> = {
  created: FileText,
  stage_changed: TrendingUp,
  health_changed: TrendingUp,
  update: MessageSquare,
  milestone_created: Clock,
  milestone_completed: CheckCircle2,
  meeting: Video,
  decision: Scale,
  publication_linked: FileText,
  publication_submitted: FileText,
  publication_accepted: CheckCircle2,
};

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={() => openExternalLink(href)}
      className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3 w-3" />
    </button>
  );
}

export default function ProjectDetailPage() {
  const { id = "" } = useParams();
  const { currentPerson } = useActiveWorkspace();

  const { data: project, isLoading } = useProject(id);
  const { data: updates = [] } = useProjectUpdates(id);
  const { data: milestones = [] } = useMilestones(id);
  const { data: meetings = [] } = useMeetings(id);
  const { data: publications = [] } = usePublications(id);
  const { data: people = [] } = usePeople();
  const { data: timeline = [] } = useProjectTimeline(id);
  const { data: openDecisions = [] } = useDecisionRequests({ status: "open", projectId: id });
  const { data: questions = [] } = useResearchQuestions(id);
  const { data: hypotheses = [] } = useHypotheses(id);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [questionPanel, setQuestionPanel] = useState<"new" | string | null>(null);
  const [hypothesisPanel, setHypothesisPanel] = useState<"new" | string | null>(null);
  const [hypothesisStatusFilter, setHypothesisStatusFilter] = useState<HypothesisStatus | null>(
    null,
  );

  const selectedQuestion =
    questionPanel && questionPanel !== "new"
      ? questions.find((q) => q.id === questionPanel)
      : undefined;
  const selectedHypothesis =
    hypothesisPanel && hypothesisPanel !== "new"
      ? hypotheses.find((h) => h.id === hypothesisPanel)
      : undefined;

  const hypothesisStatusData = HYPOTHESIS_STATUSES.map((status) => ({
    label: HYPOTHESIS_STATUS_LABELS[status],
    value: hypotheses.filter((h) => h.status === status).length,
    color: HYPOTHESIS_STATUS_COLOR[status],
  })).filter((d) => d.value > 0);

  const filteredHypotheses = hypothesisStatusFilter
    ? hypotheses.filter((h) => h.status === hypothesisStatusFilter)
    : hypotheses;

  const filteredTimeline = useMemo(
    () => timeline.filter((e) => matchesFilter(e.type, timelineFilter)),
    [timeline, timelineFilter],
  );

  if (isLoading || !project) {
    return (
      <>
        <TopBar />
        <main className="flex-1 space-y-4 p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </>
    );
  }

  const attention = calculateProjectAttention(project, new Date());

  return (
    <>
      <TopBar>
        <p className="text-foreground truncate text-sm font-medium">{project.title}</p>
      </TopBar>

      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-foreground text-2xl font-semibold">{project.title}</h1>
                <HealthBadge health={project.health} />
                <StageBadge stage={project.stage} />
                <PriorityBadge priority={project.priority} />
              </div>
              {project.description && (
                <p className="text-muted-foreground max-w-2xl text-sm">{project.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" onClick={() => setUpdateOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Update
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {project.github_url && (
              <QuickLink href={project.github_url} icon={Github} label="GitHub" />
            )}
            {project.overleaf_url && (
              <QuickLink href={project.overleaf_url} icon={FileText} label="Overleaf" />
            )}
            {project.drive_url && (
              <QuickLink href={project.drive_url} icon={HardDrive} label="Drive" />
            )}
            {project.website_url && (
              <QuickLink href={project.website_url} icon={Globe} label="Website" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoStat label="Lead" value={project.lead?.name ?? "Unassigned"} />
            <InfoStat label="Members" value={String(project.members.length)} />
            <InfoStat
              label="Next milestone"
              value={project.next_milestone ?? "—"}
              sub={project.next_milestone_date ?? undefined}
            />
            <InfoStat
              label="Last updated"
              value={
                project.last_update_at
                  ? new Date(project.last_update_at).toLocaleDateString()
                  : "Never"
              }
            />
          </div>

          {attention.signals.length > 0 && (
            <Card className="border-warning/40 bg-warning/[0.04]">
              <CardContent className="space-y-1 py-3">
                <p className="text-foreground text-xs font-semibold">Attention reasons</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  {attention.signals.map((s) => (
                    <li key={s.type}>• {s.message}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
            <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="meetings">Meetings ({meetings.length})</TabsTrigger>
            <TabsTrigger value="publications">Publications ({publications.length})</TabsTrigger>
            <TabsTrigger value="people">People ({project.members.length})</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 py-4">
                  <h3 className="text-foreground text-sm font-semibold">Latest update</h3>
                  {updates[0] ? (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">{updates[0].summary}</p>
                      {updates[0].blockers && (
                        <p className="text-destructive text-xs">Blockers: {updates[0].blockers}</p>
                      )}
                      {updates[0].next_steps && (
                        <p className="text-muted-foreground text-xs">
                          Next: {updates[0].next_steps}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No updates posted yet.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground text-sm font-semibold">Decisions</h3>
                    <Button variant="ghost" size="sm" onClick={() => setDecisionOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> New
                    </Button>
                  </div>
                  {openDecisions.length > 0 ? (
                    <div className="space-y-1.5">
                      {openDecisions.map((d) => (
                        <p key={d.id} className="text-foreground text-sm">
                          {d.title}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nothing open.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {(questions.length > 0 || hypotheses.length > 0) && (
              <Card>
                <CardContent className="space-y-1 py-4">
                  <h3 className="text-foreground text-sm font-semibold">Research state</h3>
                  <p className="text-muted-foreground text-sm">
                    {questions.length} question{questions.length === 1 ? "" : "s"}
                    {questions.filter((q) => q.status === "open" || q.status === "investigating")
                      .length > 0
                      ? ` (${questions.filter((q) => q.status === "open" || q.status === "investigating").length} open)`
                      : ""}
                    {hypotheses.length > 0 && (
                      <>
                        {" · "}
                        {hypotheses.length} hypothes{hypotheses.length === 1 ? "is" : "es"}
                        {hypothesisStatusData.length > 0 && (
                          <>
                            {" "}
                            (
                            {hypothesisStatusData
                              .map((d) => `${d.value} ${d.label.toLowerCase()}`)
                              .join(", ")}
                            )
                          </>
                        )}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground text-sm font-semibold">Members</h3>
                  <Button variant="ghost" size="sm" onClick={() => setMembersOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {project.members.map((m) => (
                    <Link
                      key={m.id}
                      to={`/people/${m.person.id}`}
                      className="border-border flex items-center gap-2 rounded-md border px-2 py-1.5"
                    >
                      <PersonAvatar
                        name={m.person.name}
                        avatarUrl={m.person.avatar_url}
                        size="sm"
                      />
                      <span className="text-sm">{m.person.name}</span>
                      <Badge variant="secondary" className="capitalize">
                        {m.role.replace("_", " ")}
                      </Badge>
                    </Link>
                  ))}
                  {project.members.length === 0 && (
                    <p className="text-muted-foreground text-sm">No members yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <GitInfoCard path={project.git_repository_path} />
              <LinkedFiles entityType="project" entityId={project.id} />
            </div>
          </TabsContent>

          <TabsContent value="updates">
            {updates.length === 0 ? (
              <EmptyState
                title="No updates yet"
                description="Post the first weekly update to start this project's journal."
                action={<Button onClick={() => setUpdateOpen(true)}>Add Update</Button>}
              />
            ) : (
              <ol className="border-border space-y-4 border-l pl-5">
                {updates.map((u) => (
                  <li key={u.id} className="relative">
                    <span className="bg-primary absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full" />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {u.author ? ` · ${u.author.name}` : ""}
                      </p>
                      {u.health && <HealthBadge health={u.health} />}
                    </div>
                    <p className="text-foreground mt-1 text-sm">{u.summary}</p>
                    {u.progress && (
                      <p className="text-muted-foreground mt-1 text-xs">Progress: {u.progress}</p>
                    )}
                    {u.blockers && (
                      <p className="text-destructive mt-1 text-xs">Blockers: {u.blockers}</p>
                    )}
                    {u.next_steps && (
                      <p className="text-muted-foreground mt-1 text-xs">Next: {u.next_steps}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setMilestoneOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Milestone
              </Button>
            </div>
            {milestones.length === 0 ? (
              <EmptyState
                title="No milestones yet"
                description="Break this project down into concrete milestones."
              />
            ) : (
              <div className="space-y-2">
                {milestones.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-foreground text-sm font-medium">{m.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {m.due_date ? new Date(m.due_date).toLocaleDateString() : "No due date"}
                          {m.owner ? ` · ${m.owner.name}` : ""}
                        </p>
                      </div>
                      <MilestoneStatusBadge status={m.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setMeetingOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Log Meeting
              </Button>
            </div>
            {meetings.length === 0 ? (
              <EmptyState
                title="No meetings logged"
                description="Record meetings, decisions, and next actions for this project."
              />
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="space-y-2 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-foreground text-sm font-medium">{m.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(m.meeting_date).toLocaleDateString()}
                        </p>
                      </div>
                      {m.decisions && (
                        <div className="border-primary/30 bg-primary/[0.04] rounded-md border p-2">
                          <p className="text-primary text-[11px] font-semibold uppercase tracking-wide">
                            Decisions
                          </p>
                          <p className="text-foreground text-xs">{m.decisions}</p>
                        </div>
                      )}
                      {m.next_steps && (
                        <p className="text-muted-foreground text-xs">Next: {m.next_steps}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="publications" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setPublicationOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Publication
              </Button>
            </div>
            {publications.length === 0 ? (
              <EmptyState
                title="No publications yet"
                description="Track papers coming out of this project."
              />
            ) : (
              <div className="space-y-2">
                {publications.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-foreground text-sm font-medium">{p.title}</p>
                        <p className="text-muted-foreground text-xs">{p.venue ?? "No venue set"}</p>
                      </div>
                      <PublicationStatusBadge status={p.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="people">
            <div className="flex justify-end pb-3">
              <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Manage members
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.members.map((m) => (
                <Link key={m.id} to={`/people/${m.person.id}`}>
                  <Card className="hover:border-foreground/20 flex items-center gap-3 p-4 transition-colors">
                    <PersonAvatar name={m.person.name} avatarUrl={m.person.avatar_url} />
                    <div>
                      <p className="text-foreground text-sm font-medium">{m.person.name}</p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {m.role.replace("_", " ")}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-6">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-sm font-semibold">
                  Questions ({questions.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setQuestionPanel("new")}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </div>
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No research questions yet.</p>
              ) : (
                <div className="divide-border border-border divide-y border-y">
                  {questions.map((q) => {
                    const Icon = QUESTION_STATUS_ICON[q.status];
                    return (
                      <button
                        key={q.id}
                        onClick={() => setQuestionPanel(q.id)}
                        className="hover:bg-muted/40 flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                      >
                        <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="text-foreground truncate">{q.question}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-sm font-semibold">
                  Hypotheses ({hypotheses.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setHypothesisPanel("new")}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </div>
              {hypothesisStatusData.length > 0 && (
                <CompactBarChart
                  data={hypothesisStatusData}
                  height={hypothesisStatusData.length * 26}
                  onBarClick={(label) => {
                    const status = HYPOTHESIS_STATUSES.find(
                      (s) => HYPOTHESIS_STATUS_LABELS[s] === label,
                    );
                    setHypothesisStatusFilter((prev) =>
                      prev === status ? null : (status ?? null),
                    );
                  }}
                />
              )}
              {filteredHypotheses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hypotheses yet.</p>
              ) : (
                <div className="divide-border border-border divide-y border-y">
                  {filteredHypotheses.map((h) => {
                    const Icon = HYPOTHESIS_STATUS_ICON[h.status];
                    return (
                      <button
                        key={h.id}
                        onClick={() => setHypothesisPanel(h.id)}
                        className="hover:bg-muted/40 flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                      >
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: HYPOTHESIS_STATUS_COLOR[h.status] }}
                        />
                        <span className="text-foreground truncate">{h.statement}</span>
                        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                          {HYPOTHESIS_STATUS_LABELS[h.status]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-3">
            <div className="flex gap-1">
              {TIMELINE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTimelineFilter(f.value)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    timelineFilter === f.value
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {filteredTimeline.length === 0 ? (
              <EmptyState title="Nothing yet" />
            ) : (
              <ol className="space-y-2">
                {filteredTimeline.map((event) => {
                  const Icon = TIMELINE_ICON[event.type];
                  return (
                    <li key={event.id} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground w-16 shrink-0 pt-0.5 text-xs">
                        {new Date(event.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Icon className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-foreground truncate">{event.summary}</p>
                        {event.detail && (
                          <p className="text-muted-foreground truncate text-xs">{event.detail}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <WeeklyUpdateDialog
        projectId={id}
        authorPersonId={currentPerson?.id ?? null}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
      />
      <ProjectFormDialog
        people={people}
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ProjectMembersDialog
        projectId={id}
        members={project.members}
        people={people}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />
      <MilestoneDialog
        projectId={id}
        people={people}
        open={milestoneOpen}
        onOpenChange={setMilestoneOpen}
      />
      <MeetingFormDialog
        createdBy={currentPerson?.id ?? null}
        projects={[project]}
        people={people}
        projectId={id}
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
      />
      <PublicationFormDialog
        projects={[project]}
        people={people}
        projectId={id}
        open={publicationOpen}
        onOpenChange={setPublicationOpen}
      />
      <DecisionRequestPanel
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        projects={[project]}
        projectId={id}
      />
      <ResearchQuestionPanel
        open={Boolean(questionPanel)}
        onOpenChange={(open) => !open && setQuestionPanel(null)}
        projectId={id}
        question={selectedQuestion}
      />
      <HypothesisPanel
        open={Boolean(hypothesisPanel)}
        onOpenChange={(open) => !open && setHypothesisPanel(null)}
        projectId={id}
        hypothesis={selectedHypothesis}
      />
    </>
  );
}

function InfoStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="text-foreground truncate text-sm font-medium">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{new Date(sub).toLocaleDateString()}</p>}
    </div>
  );
}
