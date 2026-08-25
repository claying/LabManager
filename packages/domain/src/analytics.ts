import type { ProjectHealth, ProjectStage } from "@pi-os/types";
import { PIPELINE_STAGES } from "@pi-os/types";
import { daysBetween, toDateOnly } from "./date";

// ---------------------------------------------------------------------------
// Generic period bucketing — shared by every "counts over time" chart
// (project movement, activity by type, submission load, deadline load).
// Buckets are always contiguous and always include empty periods, so a
// chart never silently drops a quiet week.
// ---------------------------------------------------------------------------

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + mondayOffset),
  );
}

/** `count` contiguous Monday-start weeks, oldest first, ending in the week containing `now`. For past activity (movement, activity-by-type, health trend). */
export function weekBuckets(count: number, now: Date = new Date()): string[] {
  const thisWeek = startOfWeek(now);
  const buckets: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.push(toDateOnly(d));
  }
  return buckets;
}

/** `count` contiguous Monday-start weeks, starting from the week containing `now`, going forward. For upcoming deadlines. */
export function weekBucketsForward(count: number, now: Date = new Date()): string[] {
  const thisWeek = startOfWeek(now);
  const buckets: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(thisWeek);
    d.setUTCDate(d.getUTCDate() + i * 7);
    buckets.push(toDateOnly(d));
  }
  return buckets;
}

/** `count` contiguous months as YYYY-MM-01, oldest first, starting from the month containing `now`. */
export function monthBuckets(count: number, now: Date = new Date()): string[] {
  const buckets: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    buckets.push(toDateOnly(d));
  }
  return buckets;
}

/** Index of the last bucket whose start is <= the given date, or -1 if the date precedes every bucket. */
function bucketIndexForDate(dateIso: string, bucketStarts: string[]): number {
  const d = new Date(dateIso);
  for (let i = bucketStarts.length - 1; i >= 0; i--) {
    if (d >= new Date(`${bucketStarts[i]}T00:00:00Z`)) return i;
  }
  return -1;
}

/** Groups items into pre-built week buckets by an ISO date field. Items before the first bucket or at/after 7 days past the last bucket are dropped. */
export function groupByWeek<T>(items: T[], getDate: (item: T) => string, buckets: string[]): T[][] {
  const result: T[][] = buckets.map(() => []);
  if (buckets.length === 0) return result;
  const windowEnd = new Date(`${buckets[buckets.length - 1]}T00:00:00Z`);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);
  for (const item of items) {
    const date = new Date(getDate(item));
    if (date >= windowEnd) continue;
    const idx = bucketIndexForDate(getDate(item), buckets);
    if (idx >= 0) result[idx]!.push(item);
  }
  return result;
}

export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
  buckets: string[],
): T[][] {
  const result: T[][] = buckets.map(() => []);
  for (const item of items) {
    const itemMonth = getDate(item).slice(0, 7); // YYYY-MM
    const idx = buckets.findIndex((b) => b.slice(0, 7) === itemMonth);
    if (idx >= 0) result[idx]!.push(item);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stage aging — median time a project spends in each pipeline stage.
// ---------------------------------------------------------------------------

export interface StageHistoryEntry {
  project_id: string;
  from_stage: ProjectStage | null;
  to_stage: ProjectStage;
  changed_at: string;
}

export interface StageAgingProjectInput {
  id: string;
  stage: ProjectStage;
  archived: boolean;
  created_at: string;
}

export interface StageAgingResult {
  stage: ProjectStage;
  medianDays: number;
  sampleCount: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/**
 * Median days spent in each stage, from recorded `project_stage_history`
 * plus each project's `created_at` as the honest start of its very first
 * stage (not a reconstruction — just the fact that a project has existed in
 * its initial/current stage since it was created, per SPEC_followup_2
 * section 33/51).
 */
export function computeStageAging(
  history: StageHistoryEntry[],
  projects: StageAgingProjectInput[],
  now: Date = new Date(),
): StageAgingResult[] {
  const durationsByStage = new Map<ProjectStage, number[]>();
  const add = (stage: ProjectStage, days: number) => {
    if (days < 0) return;
    const list = durationsByStage.get(stage) ?? [];
    list.push(days);
    durationsByStage.set(stage, list);
  };

  const historyByProject = new Map<string, StageHistoryEntry[]>();
  for (const entry of history) {
    const list = historyByProject.get(entry.project_id) ?? [];
    list.push(entry);
    historyByProject.set(entry.project_id, list);
  }

  for (const project of projects) {
    if (project.archived) continue;
    const entries = (historyByProject.get(project.id) ?? [])
      .slice()
      .sort((a, b) => (a.changed_at < b.changed_at ? -1 : 1));

    const initialStage: ProjectStage | null =
      entries[0]?.from_stage ?? (entries.length === 0 ? project.stage : null);
    if (initialStage) {
      const firstBoundary = entries[0]?.changed_at ?? now.toISOString();
      add(initialStage, daysBetween(new Date(project.created_at), new Date(firstBoundary)));
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const segmentEnd = entries[i + 1]?.changed_at ?? now.toISOString();
      add(entry.to_stage, daysBetween(new Date(entry.changed_at), new Date(segmentEnd)));
    }
  }

  return PIPELINE_STAGES.map((stage) => {
    const values = durationsByStage.get(stage) ?? [];
    return { stage, medianDays: median(values), sampleCount: values.length };
  });
}

// ---------------------------------------------------------------------------
// Project movement — stage transitions per week (a count, not a "velocity").
// ---------------------------------------------------------------------------

export function computeProjectMovement(
  transitions: { changed_at: string }[],
  weeks: number,
  now: Date = new Date(),
): { weekStart: string; count: number }[] {
  const buckets = weekBuckets(weeks, now);
  const grouped = groupByWeek(transitions, (t) => t.changed_at, buckets);
  return buckets.map((weekStart, i) => ({ weekStart, count: grouped[i]!.length }));
}

// ---------------------------------------------------------------------------
// Health trend — reconstructed from `health_changed` timeline events (no
// dedicated snapshot table needed; see SPEC_followup_2 section 34/51).
// ---------------------------------------------------------------------------

export interface HealthChangeEvent {
  project_id: string;
  health: ProjectHealth;
  changed_at: string;
}

export interface ProjectHealthState {
  id: string;
  health: ProjectHealth;
  archived: boolean;
  created_at: string;
}

/** Count of active projects in each health state, at each week boundary. */
export function computeHealthTrend(
  changes: HealthChangeEvent[],
  projects: ProjectHealthState[],
  weeks: number,
  now: Date = new Date(),
): { weekStart: string; counts: Record<ProjectHealth, number> }[] {
  const buckets = weekBuckets(weeks, now);
  const changesByProject = new Map<string, HealthChangeEvent[]>();
  for (const c of changes) {
    const list = changesByProject.get(c.project_id) ?? [];
    list.push(c);
    changesByProject.set(c.project_id, list);
  }
  for (const list of changesByProject.values())
    list.sort((a, b) => (a.changed_at < b.changed_at ? -1 : 1));

  return buckets.map((weekStart) => {
    const asOf = new Date(`${weekStart}T23:59:59.999Z`);
    const counts: Record<ProjectHealth, number> = {
      healthy: 0,
      attention: 0,
      at_risk: 0,
      stalled: 0,
    };
    for (const project of projects) {
      if (project.archived) continue;
      if (new Date(project.created_at) > asOf) continue; // project didn't exist yet at this week
      const projectChanges = changesByProject.get(project.id) ?? [];
      // Before any recorded health_changed event, assume the schema default
      // ("healthy") rather than the project's *current* health — using
      // current health here would rewrite past weeks to match today.
      let health: ProjectHealth = "healthy";
      for (const c of projectChanges) {
        if (new Date(c.changed_at) > asOf) break;
        health = c.health;
      }
      counts[health] += 1;
    }
    return { weekStart, counts };
  });
}

// ---------------------------------------------------------------------------
// Deadline / submission load — how many things are due per period, so
// clustering is visible before it becomes a crisis.
// ---------------------------------------------------------------------------

export interface DeadlineItem {
  date: string;
  kind: "paper" | "milestone" | "grant";
  label: string;
}

export function computeDeadlineLoad(
  items: DeadlineItem[],
  weeks: number,
  now: Date = new Date(),
): {
  weekStart: string;
  total: number;
  byKind: Record<DeadlineItem["kind"], number>;
  items: DeadlineItem[];
}[] {
  const buckets = weekBucketsForward(weeks, now);
  const grouped = groupByWeek(items, (i) => i.date, buckets);
  return buckets.map((weekStart, i) => {
    const bucketItems = grouped[i]!;
    const byKind: Record<DeadlineItem["kind"], number> = { paper: 0, milestone: 0, grant: 0 };
    for (const item of bucketItems) byKind[item.kind] += 1;
    return { weekStart, total: bucketItems.length, byKind, items: bucketItems };
  });
}

export function computeSubmissionLoad(
  publications: { submission_deadline: string | null }[],
  months: number,
  now: Date = new Date(),
): { monthStart: string; count: number }[] {
  const buckets = monthBuckets(months, now);
  const withDeadline = publications.filter((p): p is { submission_deadline: string } =>
    Boolean(p.submission_deadline),
  );
  const grouped = groupByMonth(withDeadline, (p) => p.submission_deadline, buckets);
  return buckets.map((monthStart, i) => ({ monthStart, count: grouped[i]!.length }));
}

// ---------------------------------------------------------------------------
// Research activity by type — never a single fabricated "activity score".
// ---------------------------------------------------------------------------

export type ActivityEventType = "update" | "meeting" | "milestone" | "decision" | "stage_change";

export function computeActivityByWeek(
  events: { date: string; type: ActivityEventType }[],
  weeks: number,
  now: Date = new Date(),
): { weekStart: string; counts: Record<ActivityEventType, number> }[] {
  const buckets = weekBuckets(weeks, now);
  const grouped = groupByWeek(events, (e) => e.date, buckets);
  return buckets.map((weekStart, i) => {
    const counts: Record<ActivityEventType, number> = {
      update: 0,
      meeting: 0,
      milestone: 0,
      decision: 0,
      stage_change: 0,
    };
    for (const e of grouped[i]!) counts[e.type] += 1;
    return { weekStart, counts };
  });
}
