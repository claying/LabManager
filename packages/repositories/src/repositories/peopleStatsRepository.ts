import { getDb } from "../db/client";

export interface PersonProjectStats {
  activeProjectCount: number;
  ledProjectCount: number;
}

export async function getPeopleProjectStats(): Promise<Record<string, PersonProjectStats>> {
  const db = await getDb();

  const membershipRows = await db.select<{ person_id: string }[]>(
    `select pm.person_id
     from project_members pm
     join projects p on p.id = pm.project_id
     where pm.left_at is null and p.archived = 0`,
  );
  const leadRows = await db.select<{ lead_person_id: string }[]>(
    `select lead_person_id from projects where archived = 0 and lead_person_id is not null`,
  );

  const stats: Record<string, PersonProjectStats> = {};
  for (const row of membershipRows) {
    stats[row.person_id] ??= { activeProjectCount: 0, ledProjectCount: 0 };
    stats[row.person_id]!.activeProjectCount += 1;
  }
  for (const row of leadRows) {
    stats[row.lead_person_id] ??= { activeProjectCount: 0, ledProjectCount: 0 };
    stats[row.lead_person_id]!.ledProjectCount += 1;
  }
  return stats;
}

export interface PersonSupervisionSignal {
  activeProjectCount: number;
  /** True when a project they lead has an unresolved blocker on its latest update. */
  blocked: boolean;
  /** Days since their last 1:1, only set once it's actually notable (14+ days). */
  noOneOnOneDays: number | null;
}

const NO_1ON1_DAYS = 14; // mirrors packages/domain/src/inbox.ts's threshold

/** Concise per-person supervision signals for People and Home (SPEC_followup section 22) — no scores, no ranking. */
export async function getPeopleSupervisionSignals(): Promise<
  Record<string, PersonSupervisionSignal>
> {
  const db = await getDb();
  const stats = await getPeopleProjectStats();

  const blockedRows = await db.select<{ lead_person_id: string }[]>(
    `select p.lead_person_id from projects p
     where p.archived = 0 and p.lead_person_id is not null
       and (select u.blockers from project_updates u where u.project_id = p.id order by u.created_at desc limit 1) is not null`,
  );
  const blockedIds = new Set(blockedRows.map((r) => r.lead_person_id));

  const lastOneOnOneRows = await db.select<{ person_id: string; last_at: string }[]>(
    `select ma.person_id, max(m.meeting_date) as last_at
     from meetings m join meeting_attendees ma on ma.meeting_id = m.id
     where m.meeting_type = 'one_on_one'
     group by ma.person_id`,
  );
  const lastOneOnOneByPerson = new Map(lastOneOnOneRows.map((r) => [r.person_id, r.last_at]));

  const activeIds = new Set(Object.keys(stats));
  for (const id of blockedIds) activeIds.add(id);

  const result: Record<string, PersonSupervisionSignal> = {};
  const now = Date.now();
  for (const id of activeIds) {
    const lastAt = lastOneOnOneByPerson.get(id);
    const days = lastAt
      ? Math.floor((now - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    result[id] = {
      activeProjectCount: stats[id]?.activeProjectCount ?? 0,
      blocked: blockedIds.has(id),
      noOneOnOneDays: days !== null && days >= NO_1ON1_DAYS ? days : null,
    };
  }
  return result;
}
