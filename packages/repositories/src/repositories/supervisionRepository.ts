import { weekBuckets, groupByWeek } from "@pi-os/domain";
import { getDb } from "../db/client";

export interface OneOnOneRhythmEntry {
  personId: string;
  name: string;
  daysSinceOneOnOne: number | null;
}

/** Days since each active person's last 1:1 — everyone, not just those over a threshold (SPEC_followup_2 section 25). */
export async function getOneOnOneRhythm(now: Date = new Date()): Promise<OneOnOneRhythmEntry[]> {
  const db = await getDb();
  const rows = await db.select<{ id: string; name: string; last_at: string | null }[]>(
    `select p.id, p.name,
       (select max(m.meeting_date) from meetings m
          join meeting_attendees ma on ma.meeting_id = m.id
          where ma.person_id = p.id and m.meeting_type = 'one_on_one') as last_at
     from people p
     where p.status = 'active'`,
  );
  return rows
    .map((r) => ({
      personId: r.id,
      name: r.name,
      daysSinceOneOnOne: r.last_at
        ? Math.floor((now.getTime() - new Date(r.last_at).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))
    .sort((a, b) => (b.daysSinceOneOnOne ?? -1) - (a.daysSinceOneOnOne ?? -1));
}

export interface ProjectLoadEntry {
  personId: string;
  name: string;
  leadCount: number;
  memberCount: number;
}

/** Active-project involvement per person, split by lead vs. member (SPEC_followup_2 section 27) — no productivity inference. */
export async function getProjectLoadByPerson(): Promise<ProjectLoadEntry[]> {
  const db = await getDb();
  const people = await db.select<{ id: string; name: string }[]>(
    "select id, name from people where status = 'active'",
  );

  const leadRows = await db.select<{ lead_person_id: string; n: number }[]>(
    "select lead_person_id, count(*) as n from projects where archived = 0 and lead_person_id is not null group by lead_person_id",
  );
  const memberRows = await db.select<{ person_id: string; n: number }[]>(
    `select pm.person_id, count(*) as n from project_members pm
     join projects p on p.id = pm.project_id
     where pm.left_at is null and p.archived = 0
     group by pm.person_id`,
  );
  const leadByPerson = new Map(leadRows.map((r) => [r.lead_person_id, r.n]));
  const memberByPerson = new Map(memberRows.map((r) => [r.person_id, r.n]));

  return people
    .map((p) => ({
      personId: p.id,
      name: p.name,
      leadCount: leadByPerson.get(p.id) ?? 0,
      memberCount: memberByPerson.get(p.id) ?? 0,
    }))
    .filter((p) => p.leadCount > 0 || p.memberCount > 0)
    .sort((a, b) => b.leadCount + b.memberCount - (a.leadCount + a.memberCount));
}

export interface InteractionWeek {
  weekStart: string;
  oneOnOnes: number;
  meetings: number;
  updates: number;
}

/** Weekly counts for the "Interaction rhythm" heatmap — supervision cadence, never framed as productivity. */
export async function getInteractionRhythm(
  weeks: number,
  now: Date = new Date(),
): Promise<InteractionWeek[]> {
  const db = await getDb();
  const buckets = weekBuckets(weeks, now);

  const oneOnOneRows = await db.select<{ meeting_date: string }[]>(
    "select meeting_date from meetings where meeting_type = 'one_on_one'",
  );
  const meetingRows = await db.select<{ meeting_date: string }[]>(
    "select meeting_date from meetings where meeting_type != 'one_on_one'",
  );
  const updateRows = await db.select<{ created_at: string }[]>(
    "select created_at from project_updates",
  );

  const oneOnOneGrouped = groupByWeek(oneOnOneRows, (r) => r.meeting_date, buckets);
  const meetingGrouped = groupByWeek(meetingRows, (r) => r.meeting_date, buckets);
  const updateGrouped = groupByWeek(updateRows, (r) => r.created_at, buckets);

  return buckets.map((weekStart, i) => ({
    weekStart,
    oneOnOnes: oneOnOneGrouped[i]!.length,
    meetings: meetingGrouped[i]!.length,
    updates: updateGrouped[i]!.length,
  }));
}
