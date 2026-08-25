import { getDb } from "../db/client";

export interface OneOnOnePrepData {
  lastOneOnOneAt: string | null;
  sinceLastOneOnOne: { projectTitle: string; detail: string }[];
  openActions: { id: string; title: string }[];
  upcoming: { title: string; detail: string }[];
  lastDecisions: string[];
}

/**
 * Everything the PI needs to see before a 1:1 starts (SPEC_followup section
 * 19) — a preparation sheet, not a form. Sections with nothing to report are
 * simply omitted by the caller (empty arrays), never shown as empty widgets.
 */
export async function getOneOnOnePrepData(personId: string): Promise<OneOnOnePrepData> {
  const db = await getDb();

  const lastOneOnOneAt =
    (
      await db.select<{ last_at: string | null }[]>(
        `select max(m.meeting_date) as last_at from meetings m
         join meeting_attendees ma on ma.meeting_id = m.id
         where ma.person_id = ? and m.meeting_type = 'one_on_one'`,
        [personId],
      )
    )[0]?.last_at ?? null;

  const activeProjects = await db.select<{ id: string; title: string }[]>(
    `select p.id, p.title from project_members pm
     join projects p on p.id = pm.project_id
     where pm.person_id = ? and pm.left_at is null and p.archived = 0`,
    [personId],
  );

  const sinceLastOneOnOne: OneOnOnePrepData["sinceLastOneOnOne"] = [];
  for (const project of activeProjects) {
    const updateCount =
      (
        await db.select<{ n: number }[]>(
          lastOneOnOneAt
            ? "select count(*) as n from project_updates where project_id = ? and created_at > ?"
            : "select count(*) as n from project_updates where project_id = ?",
          lastOneOnOneAt ? [project.id, lastOneOnOneAt] : [project.id],
        )
      )[0]?.n ?? 0;
    const latestBlockers = (
      await db.select<{ blockers: string | null }[]>(
        "select blockers from project_updates where project_id = ? order by created_at desc limit 1",
        [project.id],
      )
    )[0]?.blockers;

    if (latestBlockers) {
      sinceLastOneOnOne.push({ projectTitle: project.title, detail: "blocked" });
    } else if (updateCount > 0) {
      sinceLastOneOnOne.push({
        projectTitle: project.title,
        detail: `${updateCount} update${updateCount === 1 ? "" : "s"}`,
      });
    }
  }

  const openActions = await db.select<{ id: string; title: string }[]>(
    `select id, title from action_items where assignee_person_id = ? and status in ('open', 'in_progress')
     order by due_date is null, due_date asc limit 5`,
    [personId],
  );

  const upcoming: OneOnOnePrepData["upcoming"] = [];
  if (activeProjects.length > 0) {
    const placeholders = activeProjects.map(() => "?").join(",");
    const milestoneRows = await db.select<
      { project_title: string; title: string; due_date: string }[]
    >(
      `select p.title as project_title, m.title, m.due_date from milestones m
       join projects p on p.id = m.project_id
       where m.project_id in (${placeholders}) and m.status in ('planned', 'in_progress') and m.due_date is not null
         and m.due_date <= date('now', '+30 days')
       order by m.due_date asc limit 4`,
      activeProjects.map((p) => p.id),
    );
    for (const row of milestoneRows) {
      upcoming.push({
        title: row.project_title,
        detail: `milestone ${new Date(row.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      });
    }
  }
  const pubRows = await db.select<{ title: string; submission_deadline: string }[]>(
    `select distinct pub.title, pub.submission_deadline from publications pub
     join publication_authors pa on pa.publication_id = pub.id
     where pa.person_id = ? and pub.submission_deadline is not null and pub.submission_deadline <= date('now', '+30 days')
     order by pub.submission_deadline asc limit 3`,
    [personId],
  );
  for (const row of pubRows) {
    upcoming.push({
      title: row.title,
      detail: `review ${new Date(row.submission_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    });
  }

  const decisionPlaceholders = activeProjects.map(() => "?").join(",");
  const lastDecisions = (
    await db.select<{ decision: string }[]>(
      `select decision from decision_requests
       where status = 'resolved' and decision is not null
         and (person_id = ? ${activeProjects.length > 0 ? `or project_id in (${decisionPlaceholders})` : ""})
       order by resolved_at desc limit 3`,
      [personId, ...activeProjects.map((p) => p.id)],
    )
  ).map((r) => r.decision);

  return { lastOneOnOneAt, sinceLastOneOnOne, openActions, upcoming, lastDecisions };
}
