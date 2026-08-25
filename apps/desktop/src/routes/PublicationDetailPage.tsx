import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { calculateReadinessPercent } from "@pi-os/domain";
import { PAPER_READINESS_STATUS_LABELS, SUBMISSION_HEALTH_LABELS } from "@pi-os/types";
import {
  usePublication,
  usePaperReadiness,
  useSetReadinessStatus,
  useSubmissionPlan,
  useSubmissionHealth,
  useCreateSubmissionPlan,
  useSetSubmissionPlanItemStatus,
  useVenueCycles,
  useUpdatePublication,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { Badge } from "@pi-os/ui/components/badge";
import { PublicationStatusBadge } from "@pi-os/ui/components/domain/status-badge";
import { ProgressStrip } from "@pi-os/ui/components/domain/charts/progress-strip";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { toast } from "@pi-os/ui/components/sonner";
import { TopBar } from "../components/app-shell/topbar";

function daysUntil(dateIso: string, now = new Date()): number {
  return Math.round(
    (new Date(`${dateIso}T00:00:00Z`).getTime() -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
}

const HEALTH_TONE: Record<string, "default" | "warning" | "critical" | "success"> = {
  on_track: "success",
  attention: "warning",
  at_risk: "critical",
  late: "critical",
};

export default function PublicationDetailPage() {
  const { id = "" } = useParams();
  const { data: publication, isLoading } = usePublication(id);
  const { data: readiness = [] } = usePaperReadiness(id);
  const setReadiness = useSetReadinessStatus();
  const { data: plan } = useSubmissionPlan(id);
  const { data: health } = useSubmissionHealth(id);
  const createPlan = useCreateSubmissionPlan();
  const setPlanItemStatus = useSetSubmissionPlanItemStatus();
  const { data: cycles = [] } = useVenueCycles();
  const updatePublication = useUpdatePublication(id);
  const [showMore, setShowMore] = useState(false);

  if (isLoading || !publication) {
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

  const readinessPercent = calculateReadinessPercent(readiness);
  const deadline = publication.targetVenueCycle?.submission_deadline;
  const deadlineDays = deadline ? daysUntil(deadline) : null;

  async function onTargetVenue(cycleId: string) {
    try {
      await updatePublication.mutateAsync({
        target_venue_cycle_id: cycleId === "__none" ? null : cycleId,
      });
    } catch (error) {
      toast.error("Couldn't set target venue", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onCreatePlan() {
    try {
      await createPlan.mutateAsync({
        publicationId: id,
        venueCycleId: publication!.target_venue_cycle_id,
      });
      toast.success("Submission plan created");
    } catch (error) {
      toast.error("Couldn't create plan", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <>
      <TopBar>
        <p className="text-foreground truncate text-sm font-medium">{publication.title}</p>
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <PageHeader
              title={publication.title}
              description={
                publication.targetVenueCycle
                  ? `${publication.targetVenueCycle.venue.short_name ?? publication.targetVenueCycle.venue.name} ${publication.targetVenueCycle.cycle_label}${
                      deadlineDays !== null
                        ? ` · ${deadlineDays < 0 ? `${Math.abs(deadlineDays)}d ago` : `${deadlineDays}d`}`
                        : ""
                    }`
                  : (publication.venue ?? "No venue set")
              }
              className="py-0"
              actions={<PublicationStatusBadge status={publication.status} />}
            />
            {health && (
              <Badge
                variant={
                  HEALTH_TONE[health.status] === "success"
                    ? "success"
                    : HEALTH_TONE[health.status] === "warning"
                      ? "warning"
                      : "destructive"
                }
              >
                {SUBMISSION_HEALTH_LABELS[health.status]} · {health.reason}
              </Badge>
            )}
          </div>

          <section className="space-y-2">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Readiness
            </h2>
            <ProgressStrip percent={readinessPercent} />
            <div className="space-y-1">
              {readiness.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setReadiness.mutate({
                      itemId: item.id,
                      publicationId: id,
                      status:
                        item.status === "done"
                          ? "not_started"
                          : item.status === "not_started"
                            ? "in_progress"
                            : "done",
                    })
                  }
                  className="hover:bg-muted/40 flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm"
                >
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    {item.status === "done" ? (
                      <CheckCircle2 className="text-success h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    {PAPER_READINESS_STATUS_LABELS[item.status]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Target venue
              </h2>
            </div>
            <Select
              value={publication.target_venue_cycle_id ?? "__none"}
              onValueChange={onTargetVenue}
            >
              <SelectTrigger>
                <SelectValue placeholder="No target venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No target venue</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.venue.short_name ?? c.venue.name} {c.cycle_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Submission plan
            </h2>
            {!publication.target_venue_cycle_id ? (
              <p className="text-muted-foreground text-sm">
                Set a target venue to plan backward from its deadline.
              </p>
            ) : !plan ? (
              <Button size="sm" onClick={onCreatePlan} disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creating…" : "Create submission plan"}
              </Button>
            ) : (
              <div className="space-y-1">
                {plan.items.map((item) => {
                  const itemDate = deadline ? new Date(`${deadline}T00:00:00Z`) : null;
                  if (itemDate) itemDate.setUTCDate(itemDate.getUTCDate() + item.offset_days);
                  const overdue = item.status === "pending" && itemDate && itemDate < new Date();
                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setPlanItemStatus.mutate({
                          itemId: item.id,
                          publicationId: id,
                          status: item.status === "done" ? "pending" : "done",
                        })
                      }
                      className="hover:bg-muted/40 flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm"
                    >
                      <span
                        className={
                          item.status === "done"
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }
                      >
                        {item.label}
                      </span>
                      <span
                        className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {item.status === "done"
                          ? "done"
                          : itemDate?.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <button
              onClick={() => setShowMore((v) => !v)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              {showMore ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}{" "}
              More
            </button>
            {showMore && (
              <div className="mt-2 space-y-2 text-sm">
                <Row
                  label="Project"
                  value={
                    publication.project ? (
                      <Link
                        className="text-primary hover:underline"
                        to={`/projects/${publication.project.id}`}
                      >
                        {publication.project.title}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row
                  label="Authors"
                  value={publication.authors.map((a) => a.name).join(", ") || "—"}
                />
                <Row label="DOI" value={publication.doi ?? "—"} />
                <Row label="arXiv" value={publication.arxiv_url ?? "—"} />
                <Row label="Notes" value={publication.notes ?? "—"} />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
