import type { ProjectHealth, PublicationStatus } from "@pi-os/types";
import { daysSince, daysUntil } from "./date";

export type AttentionSignalType =
  | "NO_UPDATE_14_DAYS"
  | "NO_UPDATE_30_DAYS"
  | "MILESTONE_DUE_SOON"
  | "MILESTONE_OVERDUE"
  | "PUBLICATION_DEADLINE_SOON";

export type AttentionSeverity = "warning" | "critical";

export interface AttentionSignal {
  type: AttentionSignalType;
  message: string;
  severity: AttentionSeverity;
}

export interface ProjectAttentionInput {
  health: ProjectHealth;
  archived: boolean;
  last_update_at: string | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
}

export interface ProjectAttentionResult {
  /** True when this project should surface in the Dashboard's "Need Attention" list. */
  needsAttention: boolean;
  signals: AttentionSignal[];
}

const NO_UPDATE_WARNING_DAYS = 14;
const NO_UPDATE_CRITICAL_DAYS = 30;
const MILESTONE_DUE_SOON_DAYS = 7;

/**
 * Deterministic, explainable attention signals for a single project.
 * Never mutates project.health — callers decide whether/how to act on signals.
 */
export function calculateProjectAttention(
  project: ProjectAttentionInput,
  now: Date = new Date(),
): ProjectAttentionResult {
  if (project.archived) {
    return { needsAttention: false, signals: [] };
  }

  const signals: AttentionSignal[] = [];

  if (project.last_update_at) {
    const days = daysSince(new Date(project.last_update_at), now);
    if (days >= NO_UPDATE_CRITICAL_DAYS) {
      signals.push({
        type: "NO_UPDATE_30_DAYS",
        message: `No update for ${days} days`,
        severity: "critical",
      });
    } else if (days >= NO_UPDATE_WARNING_DAYS) {
      signals.push({
        type: "NO_UPDATE_14_DAYS",
        message: `No update for ${days} days`,
        severity: "warning",
      });
    }
  }

  if (project.next_milestone_date) {
    const until = daysUntil(new Date(project.next_milestone_date), now);
    if (until < 0) {
      const overdueDays = Math.abs(until);
      signals.push({
        type: "MILESTONE_OVERDUE",
        message: `${project.next_milestone ?? "Next milestone"} overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        severity: "critical",
      });
    } else if (until <= MILESTONE_DUE_SOON_DAYS) {
      signals.push({
        type: "MILESTONE_DUE_SOON",
        message: `${project.next_milestone ?? "Next milestone"} due in ${until} day${until === 1 ? "" : "s"}`,
        severity: "warning",
      });
    }
  }

  const hasBlockingSignal = signals.some(
    (s) =>
      s.type === "NO_UPDATE_14_DAYS" ||
      s.type === "NO_UPDATE_30_DAYS" ||
      s.type === "MILESTONE_OVERDUE",
  );
  const needsAttention =
    project.health === "at_risk" || project.health === "stalled" || hasBlockingSignal;

  return { needsAttention, signals };
}

export interface PublicationDeadlineInput {
  status: PublicationStatus;
  submission_deadline: string | null;
}

const DONE_PUBLICATION_STATUSES: PublicationStatus[] = [
  "submitted",
  "rebuttal",
  "accepted",
  "published",
  "withdrawn",
];

/** A single PUBLICATION_DEADLINE_SOON signal, or null if not applicable. */
export function calculatePublicationDeadlineSignal(
  publication: PublicationDeadlineInput,
  now: Date = new Date(),
): AttentionSignal | null {
  if (!publication.submission_deadline) return null;
  if (DONE_PUBLICATION_STATUSES.includes(publication.status)) return null;

  const until = daysUntil(new Date(publication.submission_deadline), now);
  if (until > 60) return null;

  return {
    type: "PUBLICATION_DEADLINE_SOON",
    message:
      until < 0
        ? `Submission deadline passed ${Math.abs(until)} day${Math.abs(until) === 1 ? "" : "s"} ago`
        : `Submission deadline in ${until} day${until === 1 ? "" : "s"}`,
    severity: until < 7 ? "critical" : "warning",
  };
}

export function deadlineUrgency(
  daysAway: number,
): "overdue" | "urgent" | "soon" | "upcoming" | "none" {
  if (daysAway < 0) return "overdue";
  if (daysAway <= 7) return "urgent";
  if (daysAway <= 30) return "soon";
  if (daysAway <= 60) return "upcoming";
  return "none";
}
