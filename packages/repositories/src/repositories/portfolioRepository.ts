import type { ActivityEventType, DeadlineItem } from "@pi-os/domain";
import {
  calculatePipelineCounts,
  computeActivityByWeek,
  computeDeadlineLoad,
  computeHealthTrend,
  computeProjectMovement,
  computeStageAging,
  computeSubmissionLoad,
} from "@pi-os/domain";
import type { PIPELINE_STAGES } from "@pi-os/types";
import { getDb } from "../db/client";

/** Stage distribution — non-archived projects by pipeline stage (SPEC_followup_2 section 30). */
export async function getStageDistribution() {
  const db = await getDb();
  const rows = await db.select<{ stage: string; archived: number }[]>(
    "select stage, archived from projects",
  );
  return calculatePipelineCounts(
    rows.map((r) => ({
      stage: r.stage as (typeof PIPELINE_STAGES)[number],
      archived: Boolean(r.archived),
    })),
  );
}

/** Median days spent in each stage (SPEC_followup_2 section 32). */
export async function getStageAging(now: Date = new Date()) {
  const db = await getDb();
  const history = await db.select<
    { project_id: string; from_stage: string | null; to_stage: string; changed_at: string }[]
  >("select project_id, from_stage, to_stage, changed_at from project_stage_history");
  const projects = await db.select<
    { id: string; stage: string; archived: number; created_at: string }[]
  >("select id, stage, archived, created_at from projects");
  return computeStageAging(
    history as Parameters<typeof computeStageAging>[0],
    projects.map((p) => ({ ...p, archived: Boolean(p.archived) })) as Parameters<
      typeof computeStageAging
    >[1],
    now,
  );
}

/** Stage transitions per week (SPEC_followup_2 section 31) — "movement," never "velocity." */
export async function getProjectMovement(weeks: number, now: Date = new Date()) {
  const db = await getDb();
  const rows = await db.select<{ changed_at: string }[]>(
    "select changed_at from project_stage_history",
  );
  return computeProjectMovement(rows, weeks, now);
}

/** Weekly active-project health counts, reconstructed from recorded project_health_history (SPEC_followup_2 section 34). */
export async function getHealthTrend(weeks: number, now: Date = new Date()) {
  const db = await getDb();
  const changeRows = await db.select<
    { project_id: string; to_health: string; changed_at: string }[]
  >("select project_id, to_health, changed_at from project_health_history");
  const projects = await db.select<
    { id: string; health: string; archived: number; created_at: string }[]
  >("select id, health, archived, created_at from projects");
  const changes = changeRows.map((r) => ({
    project_id: r.project_id,
    health: r.to_health,
    changed_at: r.changed_at,
  }));

  return computeHealthTrend(
    changes as Parameters<typeof computeHealthTrend>[0],
    projects.map((p) => ({ ...p, archived: Boolean(p.archived) })) as Parameters<
      typeof computeHealthTrend
    >[1],
    weeks,
    now,
  );
}

/** Upcoming deadline load across papers, milestones, and grants, by week (SPEC_followup_2 section 35). */
export async function getDeadlineLoad(weeks: number, now: Date = new Date()) {
  const db = await getDb();
  const items: DeadlineItem[] = [];

  const pubs = await db.select<{ title: string; submission_deadline: string }[]>(
    "select title, submission_deadline from publications where submission_deadline is not null",
  );
  for (const p of pubs) items.push({ date: p.submission_deadline, kind: "paper", label: p.title });

  const milestones = await db.select<{ title: string; due_date: string; project_title: string }[]>(
    `select m.title, m.due_date, p.title as project_title from milestones m
     join projects p on p.id = m.project_id
     where m.due_date is not null and m.status in ('planned', 'in_progress') and p.archived = 0`,
  );
  for (const m of milestones)
    items.push({ date: m.due_date, kind: "milestone", label: `${m.project_title} — ${m.title}` });

  const grants = await db.select<{ title: string; deadline: string }[]>(
    "select title, deadline from grants where deadline is not null and status in ('idea', 'preparing', 'submitted')",
  );
  for (const g of grants) items.push({ date: g.deadline, kind: "grant", label: g.title });

  return computeDeadlineLoad(items, weeks, now);
}

/** Publications by submission-deadline month (SPEC_followup_2 section 22) — is too much converging on one deadline? */
export async function getSubmissionLoad(months: number, now: Date = new Date()) {
  const db = await getDb();
  const pubs = await db.select<{ submission_deadline: string | null }[]>(
    "select submission_deadline from publications where status not in ('submitted', 'rebuttal', 'accepted', 'published', 'withdrawn')",
  );
  return computeSubmissionLoad(pubs, months, now);
}

/** Weekly counts of updates/meetings/milestones/decisions/stage-changes, kept as separate series (never a combined "activity score"). */
export async function getActivityByWeek(weeks: number, now: Date = new Date()) {
  const db = await getDb();
  const events: { date: string; type: ActivityEventType }[] = [];

  const updates = await db.select<{ created_at: string }[]>(
    "select created_at from project_updates",
  );
  for (const r of updates) events.push({ date: r.created_at, type: "update" });

  const meetings = await db.select<{ meeting_date: string }[]>("select meeting_date from meetings");
  for (const r of meetings) events.push({ date: r.meeting_date, type: "meeting" });

  const milestones = await db.select<{ completed_at: string }[]>(
    "select completed_at from milestones where completed_at is not null",
  );
  for (const r of milestones) events.push({ date: r.completed_at, type: "milestone" });

  const decisions = await db.select<{ resolved_at: string }[]>(
    "select resolved_at from decision_requests where resolved_at is not null",
  );
  for (const r of decisions) events.push({ date: r.resolved_at, type: "decision" });

  const stageChanges = await db.select<{ changed_at: string }[]>(
    "select changed_at from project_stage_history",
  );
  for (const r of stageChanges) events.push({ date: r.changed_at, type: "stage_change" });

  return computeActivityByWeek(events, weeks, now);
}
