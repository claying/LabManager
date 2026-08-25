import { useState } from "react";
import type { WeeklyReviewSnapshot } from "@pi-os/types";
import {
  useWeeklyReviewPreview,
  useWeeklyReviewList,
  useWeeklyReview,
  useSaveWeeklyReview,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { cn } from "@pi-os/ui/lib/utils";
import { toast } from "@pi-os/ui/components/sonner";
import { TopBar } from "../components/app-shell/topbar";

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${weekEnd}T00:00:00Z`);
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? end.toLocaleDateString(undefined, { day: "numeric", timeZone: "UTC" })
      : end.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${startLabel}–${endLabel}`;
}

export default function ReviewPage() {
  const { data: preview, isLoading: previewLoading } = useWeeklyReviewPreview();
  const { data: pastReviews } = useWeeklyReviewList();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null); // null = current week (live)
  const { data: savedReview } = useWeeklyReview(selectedWeek ?? undefined);
  const saveReview = useSaveWeeklyReview();

  const viewingCurrent = selectedWeek === null;
  const snapshot: WeeklyReviewSnapshot | undefined = viewingCurrent
    ? preview?.snapshot
    : savedReview?.snapshot;
  const weekLabel = viewingCurrent
    ? preview
      ? formatWeekLabel(preview.weekStart, preview.weekEnd)
      : ""
    : savedReview
      ? formatWeekLabel(savedReview.week_start, savedReview.week_end)
      : "";

  async function onSave() {
    if (!preview) return;
    try {
      await saveReview.mutateAsync({
        weekStart: preview.weekStart,
        weekEnd: preview.weekEnd,
        snapshot: preview.snapshot,
      });
      toast.success("Review saved");
    } catch (error) {
      toast.error("Couldn't save review", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <>
      <TopBar>
        <PageHeader title="Weekly Review" className="py-0" />
      </TopBar>
      <main className="flex flex-1 overflow-hidden">
        <aside className="border-border w-40 shrink-0 space-y-0.5 overflow-y-auto border-r p-3">
          <button
            onClick={() => setSelectedWeek(null)}
            className={cn(
              "block w-full rounded-md px-2 py-1.5 text-left text-sm",
              viewingCurrent
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            This week
          </button>
          {pastReviews?.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedWeek(r.week_start)}
              className={cn(
                "block w-full rounded-md px-2 py-1.5 text-left text-sm",
                selectedWeek === r.week_start
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {formatWeekLabel(r.week_start, r.week_end)}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          {(viewingCurrent && previewLoading) || (!viewingCurrent && !savedReview) ? (
            <div className="max-w-xl space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : snapshot ? (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-foreground text-lg font-semibold">{weekLabel}</h1>
                {viewingCurrent && (
                  <Button size="sm" onClick={onSave} disabled={saveReview.isPending}>
                    {saveReview.isPending ? "Saving…" : "Save Review"}
                  </Button>
                )}
              </div>

              <ReviewSection title="Progress">
                {snapshot.progress.map((p) => (
                  <p key={p.label} className="text-sm">
                    <span className="text-foreground font-medium">{p.count}</span>{" "}
                    <span className="text-muted-foreground">{p.label}</span>
                  </p>
                ))}
              </ReviewSection>

              <ReviewSection title="Needs attention">
                {snapshot.needsAttention.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.label}</span>
                    <span className="text-muted-foreground">{p.detail}</span>
                  </div>
                ))}
              </ReviewSection>

              <ReviewSection title="Decisions">
                {snapshot.decisions.map((d, i) => (
                  <p key={i} className="text-foreground text-sm">
                    {d}
                  </p>
                ))}
              </ReviewSection>

              <ReviewSection title="People">
                {snapshot.people.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.name}</span>
                    <span className="text-muted-foreground">{p.detail}</span>
                  </div>
                ))}
              </ReviewSection>

              <ReviewSection title="Next week">
                {snapshot.nextWeek.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.label}</span>
                    <span className="text-muted-foreground">{p.detail}</span>
                  </div>
                ))}
              </ReviewSection>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
