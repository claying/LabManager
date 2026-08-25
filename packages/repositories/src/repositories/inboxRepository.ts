import type { InboxItem } from "@pi-os/types";
import { computeInboxItems, sortInboxItems, type InboxComputeInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { nowIso } from "../db/util";

export interface InboxRepository {
  /** Computes the current Inbox from live data, then hides dismissed/snoozed rows. */
  list(): Promise<InboxItem[]>;
  snooze(key: string, untilIso: string): Promise<void>;
  dismiss(key: string): Promise<void>;
  /** Undoes a snooze/dismiss (SPEC_followup section 31 — undo toasts over confirm dialogs). */
  clearState(key: string): Promise<void>;
}

/** Exported for weeklyReviewRepository, which reuses the same live signal data. */
export async function getInboxComputeInput(): Promise<InboxComputeInput> {
  const db = await getDb();

  type ProjectRow = Omit<InboxComputeInput["projects"][number], "archived"> & { archived: number };
  const projectRows = await db.select<ProjectRow[]>(
    `select p.id, p.title, p.short_name, p.health, p.archived, p.last_update_at, p.next_milestone, p.next_milestone_date,
       lp.name as leadName,
       (select u.blockers from project_updates u where u.project_id = p.id order by u.created_at desc limit 1) as latestUpdateBlockers
     from projects p
     left join people lp on lp.id = p.lead_person_id
     where p.archived = 0`,
  );
  const projects = projectRows.map((r) => ({ ...r, archived: Boolean(r.archived) }));

  const milestones = await db.select<InboxComputeInput["milestones"]>(
    `select m.id, m.project_id, p.title as project_title, m.title, m.due_date, m.status
     from milestones m join projects p on p.id = m.project_id
     where m.status in ('planned', 'in_progress') and p.archived = 0`,
  );

  const publications = await db.select<InboxComputeInput["publications"]>(
    "select id, title, status, submission_deadline from publications",
  );

  const grants = await db.select<InboxComputeInput["grants"]>(
    "select id, title, status, deadline from grants",
  );

  const decisions = await db.select<InboxComputeInput["decisions"]>(
    `select d.id, d.title, d.project_id, pr.title as project_title, pe.name as person_name, d.priority, d.status
     from decision_requests d
     left join projects pr on pr.id = d.project_id
     left join people pe on pe.id = d.person_id
     where d.status = 'open'`,
  );

  const people = await db.select<InboxComputeInput["people"]>(
    `select id, name, status,
       (select max(m.meeting_date) from meetings m
          join meeting_attendees ma on ma.meeting_id = m.id
          where ma.person_id = pe.id and m.meeting_type = 'one_on_one') as lastOneOnOneAt
     from people pe`,
  );

  const actionItems = await db.select<InboxComputeInput["actionItems"]>(
    `select a.id, a.title, pr.title as project_title, pe.name as assignee_name, a.due_date, a.status
     from action_items a
     left join projects pr on pr.id = a.project_id
     left join people pe on pe.id = a.assignee_person_id
     where a.status in ('open', 'in_progress') and a.due_date is not null`,
  );

  return { projects, milestones, publications, grants, decisions, people, actionItems };
}

export const inboxRepository: InboxRepository = {
  async list() {
    const db = await getDb();
    const input = await getInboxComputeInput();
    const items = sortInboxItems(computeInboxItems(input));
    if (items.length === 0) return items;

    const keys = items.map((i) => i.key);
    const placeholders = keys.map(() => "?").join(",");
    const stateRows = await db.select<
      { item_key: string; snoozed_until: string | null; dismissed_at: string | null }[]
    >(
      `select item_key, snoozed_until, dismissed_at from inbox_state where item_key in (${placeholders})`,
      keys,
    );
    const stateByKey = new Map(stateRows.map((r) => [r.item_key, r]));
    const now = nowIso();

    const visible = items.filter((item) => {
      const state = stateByKey.get(item.key);
      if (!state) return true;
      if (state.dismissed_at) return false;
      if (state.snoozed_until && state.snoozed_until > now) return false;
      return true;
    });

    // Touch last_seen_at for whatever's still visible, so a future "recently
    // resurfaced" feature has a real signal to work with without another migration.
    for (const item of visible) {
      await db.execute(
        `insert into inbox_state (item_key, last_seen_at) values (?, ?)
         on conflict(item_key) do update set last_seen_at = excluded.last_seen_at`,
        [item.key, now],
      );
    }

    return visible;
  },

  async snooze(key, untilIso) {
    const db = await getDb();
    await db.execute(
      `insert into inbox_state (item_key, snoozed_until, last_seen_at) values (?, ?, ?)
       on conflict(item_key) do update set snoozed_until = excluded.snoozed_until, dismissed_at = null`,
      [key, untilIso, nowIso()],
    );
  },

  async dismiss(key) {
    const db = await getDb();
    await db.execute(
      `insert into inbox_state (item_key, dismissed_at, last_seen_at) values (?, ?, ?)
       on conflict(item_key) do update set dismissed_at = excluded.dismissed_at`,
      [key, nowIso(), nowIso()],
    );
  },

  async clearState(key) {
    const db = await getDb();
    await db.execute(
      `update inbox_state set snoozed_until = null, dismissed_at = null where item_key = ?`,
      [key],
    );
  },
};
