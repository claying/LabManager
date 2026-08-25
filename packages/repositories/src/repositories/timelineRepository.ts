import type { TimelineEvent } from "@pi-os/types";
import { PROJECT_HEALTH_LABELS, PROJECT_STAGE_LABELS } from "@pi-os/types";
import { getDb } from "../db/client";

/**
 * Assembles a project's chronological timeline entirely from existing
 * records (SPEC_followup section 15) — nothing here is authored by hand.
 * Stage transitions come from `project_stage_history`, health transitions
 * from the small `timeline_events` support table; everything else is read
 * straight from its source table.
 */
export async function getProjectTimeline(projectId: string): Promise<TimelineEvent[]> {
  const db = await getDb();
  const events: TimelineEvent[] = [];

  const project = (
    await db.select<{ title: string; created_at: string }[]>(
      "select title, created_at from projects where id = ?",
      [projectId],
    )
  )[0];
  if (!project) return [];
  events.push({
    id: `created:${projectId}`,
    type: "created",
    date: project.created_at,
    summary: "Project created",
    detail: null,
  });

  const stageRows = await db.select<
    { id: string; to_stage: keyof typeof PROJECT_STAGE_LABELS; changed_at: string }[]
  >("select id, to_stage, changed_at from project_stage_history where project_id = ?", [projectId]);
  for (const row of stageRows) {
    events.push({
      id: row.id,
      type: "stage_changed",
      date: row.changed_at,
      summary: `Stage → ${PROJECT_STAGE_LABELS[row.to_stage]}`,
      detail: null,
    });
  }

  const healthRows = await db.select<
    { id: string; to_health: keyof typeof PROJECT_HEALTH_LABELS; changed_at: string }[]
  >("select id, to_health, changed_at from project_health_history where project_id = ?", [
    projectId,
  ]);
  for (const row of healthRows) {
    events.push({
      id: row.id,
      type: "health_changed",
      date: row.changed_at,
      summary: `Health → ${PROJECT_HEALTH_LABELS[row.to_health]}`,
      detail: null,
    });
  }

  const updateRows = await db.select<{ id: string; summary: string; created_at: string }[]>(
    "select id, summary, created_at from project_updates where project_id = ?",
    [projectId],
  );
  for (const row of updateRows) {
    events.push({
      id: row.id,
      type: "update",
      date: row.created_at,
      summary: "Update",
      detail: row.summary,
    });
  }

  const milestoneRows = await db.select<
    { id: string; title: string; status: string; created_at: string; completed_at: string | null }[]
  >("select id, title, status, created_at, completed_at from milestones where project_id = ?", [
    projectId,
  ]);
  for (const row of milestoneRows) {
    events.push({
      id: `${row.id}:created`,
      type: "milestone_created",
      date: row.created_at,
      summary: row.title,
      detail: null,
    });
    if (row.completed_at) {
      events.push({
        id: `${row.id}:completed`,
        type: "milestone_completed",
        date: row.completed_at,
        summary: row.title,
        detail: null,
      });
    }
  }

  const meetingRows = await db.select<
    { id: string; title: string; meeting_date: string; decisions: string | null }[]
  >("select id, title, meeting_date, decisions from meetings where project_id = ?", [projectId]);
  for (const row of meetingRows) {
    const actionCount =
      (
        await db.select<{ n: number }[]>(
          "select count(*) as n from action_items where meeting_id = ?",
          [row.id],
        )
      )[0]?.n ?? 0;
    const parts: string[] = [];
    if (actionCount > 0) parts.push(`${actionCount} action${actionCount === 1 ? "" : "s"}`);
    if (row.decisions?.trim()) parts.push("1 decision");
    events.push({
      id: row.id,
      type: "meeting",
      date: row.meeting_date,
      summary: row.title,
      detail: parts.join(" · ") || null,
    });
  }

  const decisionRows = await db.select<{ id: string; decision: string; resolved_at: string }[]>(
    "select id, decision, resolved_at from decision_requests where project_id = ? and status = 'resolved' and resolved_at is not null",
    [projectId],
  );
  for (const row of decisionRows) {
    events.push({
      id: row.id,
      type: "decision",
      date: row.resolved_at,
      summary: row.decision,
      detail: null,
    });
  }

  const pubRows = await db.select<
    {
      id: string;
      title: string;
      created_at: string;
      submission_date: string | null;
      acceptance_date: string | null;
    }[]
  >(
    "select id, title, created_at, submission_date, acceptance_date from publications where project_id = ?",
    [projectId],
  );
  for (const row of pubRows) {
    events.push({
      id: `${row.id}:linked`,
      type: "publication_linked",
      date: row.created_at,
      summary: row.title,
      detail: null,
    });
    if (row.submission_date) {
      events.push({
        id: `${row.id}:submitted`,
        type: "publication_submitted",
        date: row.submission_date,
        summary: row.title,
        detail: null,
      });
    }
    if (row.acceptance_date) {
      events.push({
        id: `${row.id}:accepted`,
        type: "publication_accepted",
        date: row.acceptance_date,
        summary: row.title,
        detail: null,
      });
    }
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
