import type { PaperReadinessStatus, SubmissionHealth } from "@pi-os/types";
import { DEFAULT_SUBMISSION_PLAN_TEMPLATE } from "@pi-os/types";
import { daysUntil, toDateOnly } from "./date";

export interface SubmissionPlanItemInput {
  label: string;
  offsetDays: number;
}

/** Generates the internal-milestone template as absolute dates from a venue cycle's submission deadline. */
export function generatePlanDates(
  submissionDeadline: Date,
  template: SubmissionPlanItemInput[] = DEFAULT_SUBMISSION_PLAN_TEMPLATE.map((t) => ({
    label: t.label,
    offsetDays: t.offsetDays,
  })),
): { label: string; offsetDays: number; dueDate: string }[] {
  return template.map((item) => {
    const due = new Date(submissionDeadline);
    due.setUTCDate(due.getUTCDate() + item.offsetDays);
    return { label: item.label, offsetDays: item.offsetDays, dueDate: toDateOnly(due) };
  });
}

export interface SubmissionPlanItemState {
  label: string;
  offsetDays: number;
  status: "pending" | "done";
}

/**
 * Deterministic submission health (SPEC_followup_2 section 19) — never a
 * prediction, always a plain-English reason derived from the plan itself.
 */
export function calculateSubmissionHealth(
  items: SubmissionPlanItemState[],
  submissionDeadline: string,
  now: Date = new Date(),
): SubmissionHealth {
  const deadline = new Date(submissionDeadline);
  const daysToDeadline = daysUntil(deadline, now);

  const withDueDates = items.map((item) => {
    const due = new Date(deadline);
    due.setUTCDate(due.getUTCDate() + item.offsetDays);
    return { ...item, dueDate: due };
  });

  const allDone = withDueDates.every((i) => i.status === "done");

  if (daysToDeadline < 0) {
    if (allDone) return { status: "on_track", reason: "Submitted" };
    return {
      status: "late",
      reason: `Submission deadline passed ${Math.abs(daysToDeadline)}d ago`,
    };
  }

  const overdue = withDueDates
    .filter((i) => i.status === "pending" && i.dueDate < now)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  if (overdue.length > 0) {
    const worst = overdue[0]!;
    const overdueDays = Math.abs(daysUntil(worst.dueDate, now));
    if (overdueDays > 5 || daysToDeadline <= 3) {
      return { status: "at_risk", reason: `${worst.label} ${overdueDays}d overdue` };
    }
    return { status: "attention", reason: `${worst.label} ${overdueDays}d overdue` };
  }

  const nextPending = withDueDates
    .filter((i) => i.status === "pending")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  if (nextPending) {
    const until = daysUntil(nextPending.dueDate, now);
    if (until <= 2) return { status: "attention", reason: `${nextPending.label} due in ${until}d` };
  }

  return { status: "on_track", reason: "On track" };
}

export interface ReadinessItemState {
  status: PaperReadinessStatus;
}

/** Percent complete, treating "in_progress" as half-credit and excluding not-applicable items entirely. */
export function calculateReadinessPercent(items: ReadinessItemState[]): number {
  const applicable = items.filter((i) => i.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const score = applicable.reduce(
    (sum, i) => sum + (i.status === "done" ? 1 : i.status === "in_progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / applicable.length) * 100);
}
