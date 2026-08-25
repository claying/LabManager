import type { WeeklyReviewSnapshot } from "@pi-os/types";

export interface WeeklyReviewInput {
  projectsAdvancedCount: number;
  milestonesCompletedCount: number;
  /** Publications that changed status this week, grouped for the "N papers moved to X" line. */
  publicationStageChanges: { statusLabel: string; count: number }[];
  needsAttention: { title: string; detail: string }[];
  decisionsResolved: { title: string; decision: string | null }[];
  people: { name: string; blocked: boolean; noOneOnOneDays: number | null; updateCount: number }[];
  nextWeek: { title: string; detail: string }[];
}

/**
 * Deterministic weekly-review snapshot (SPEC_followup section 23/24) — no
 * AI, no randomness. Given the same input, always produces the same output,
 * which is what makes a *saved* review a trustworthy frozen record later.
 */
export function computeWeeklyReview(input: WeeklyReviewInput): WeeklyReviewSnapshot {
  const progress: WeeklyReviewSnapshot["progress"] = [];
  if (input.projectsAdvancedCount > 0) {
    progress.push({ label: "projects advanced", count: input.projectsAdvancedCount });
  }
  if (input.milestonesCompletedCount > 0) {
    progress.push({ label: "milestones completed", count: input.milestonesCompletedCount });
  }
  for (const change of input.publicationStageChanges) {
    if (change.count > 0)
      progress.push({
        label: `paper${change.count === 1 ? "" : "s"} moved to ${change.statusLabel}`,
        count: change.count,
      });
  }

  const needsAttention = input.needsAttention.map((p) => ({ label: p.title, detail: p.detail }));

  const decisions = input.decisionsResolved.map((d) => d.decision?.trim() || d.title);

  const people = input.people
    .map((p) => {
      const detail = p.blocked
        ? "blocked"
        : p.noOneOnOneDays !== null
          ? `no 1:1 in ${p.noOneOnOneDays}d`
          : p.updateCount > 0
            ? `${p.updateCount} update${p.updateCount === 1 ? "" : "s"}`
            : null;
      return detail ? { name: p.name, detail } : null;
    })
    .filter((p): p is { name: string; detail: string } => p !== null);

  const nextWeek = input.nextWeek.map((n) => ({ label: n.title, detail: n.detail }));

  return { progress, needsAttention, decisions, people, nextWeek };
}
