import type { WeeklyReview, WeeklyReviewSnapshot } from "@pi-os/types";
import { PUBLICATION_STATUS_LABELS, type PublicationStatus } from "@pi-os/types";
import { computeInboxItems, computeWeeklyReview, getWeekRange } from "@pi-os/domain";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";
import { getInboxComputeInput } from "./inboxRepository";

const NO_1ON1_DAYS = 14; // mirrors packages/domain/src/inbox.ts's threshold

function rangeBounds(weekStart: string, weekEnd: string): { start: string; endExclusive: string } {
  const start = `${weekStart}T00:00:00.000Z`;
  const endExclusiveDate = new Date(`${weekEnd}T00:00:00.000Z`);
  endExclusiveDate.setUTCDate(endExclusiveDate.getUTCDate() + 1);
  return { start, endExclusive: endExclusiveDate.toISOString() };
}

/**
 * Computes a fresh snapshot for the given week from live data (SPEC_followup
 * section 24). "Needs attention" and "Next week" reuse the exact same
 * signal computation as the live Inbox (as of right now, not week-end) so
 * the two surfaces never disagree about what's urgent.
 */
export async function generateWeeklyReviewSnapshot(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyReviewSnapshot> {
  const db = await getDb();
  const { start, endExclusive } = rangeBounds(weekStart, weekEnd);

  const projectsAdvancedCount =
    (
      await db.select<{ n: number }[]>(
        "select count(distinct project_id) as n from timeline_events where event_type = 'stage_changed' and created_at >= ? and created_at < ?",
        [start, endExclusive],
      )
    )[0]?.n ?? 0;

  const milestonesCompletedCount =
    (
      await db.select<{ n: number }[]>(
        "select count(*) as n from milestones where completed_at >= ? and completed_at < ?",
        [start, endExclusive],
      )
    )[0]?.n ?? 0;

  const pubStageRows = await db.select<{ status: PublicationStatus; n: number }[]>(
    "select status, count(*) as n from publications where updated_at >= ? and updated_at < ? group by status",
    [start, endExclusive],
  );
  const publicationStageChanges = pubStageRows.map((r) => ({
    statusLabel: PUBLICATION_STATUS_LABELS[r.status] ?? r.status,
    count: r.n,
  }));

  const decisionsResolved = await db.select<{ title: string; decision: string | null }[]>(
    "select title, decision from decision_requests where status = 'resolved' and resolved_at >= ? and resolved_at < ?",
    [start, endExclusive],
  );

  // Reuse the live Inbox's signal computation so "needs attention" and
  // "next week" here are never out of sync with what the Inbox itself shows.
  const inboxInput = await getInboxComputeInput();
  const liveItems = computeInboxItems(inboxInput);
  const needsAttention = liveItems
    .filter((i) => i.entityType === "project")
    .slice(0, 6)
    .map((i) => ({ title: i.title, detail: i.context }));
  const nextWeek = liveItems
    .filter((i) => i.group === "due_soon" || i.group === "decide")
    .slice(0, 6)
    .map((i) => ({ title: i.title, detail: i.context }));

  const activePeople = await db.select<{ id: string; name: string }[]>(
    "select id, name from people where status = 'active'",
  );
  const people = [];
  for (const person of activePeople) {
    const updateCount =
      (
        await db.select<{ n: number }[]>(
          "select count(*) as n from project_updates where author_person_id = ? and created_at >= ? and created_at < ?",
          [person.id, start, endExclusive],
        )
      )[0]?.n ?? 0;

    const blocked =
      (
        await db.select<{ n: number }[]>(
          `select count(*) as n from projects p
           where p.lead_person_id = ? and p.archived = 0
             and (select u.blockers from project_updates u where u.project_id = p.id order by u.created_at desc limit 1) is not null`,
          [person.id],
        )
      )[0]?.n ?? 0;

    const lastOneOnOne = (
      await db.select<{ last_at: string | null }[]>(
        `select max(m.meeting_date) as last_at from meetings m
         join meeting_attendees ma on ma.meeting_id = m.id
         where ma.person_id = ? and m.meeting_type = 'one_on_one'`,
        [person.id],
      )
    )[0]?.last_at;
    const noOneOnOneDays = lastOneOnOne
      ? Math.floor((Date.now() - new Date(lastOneOnOne).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    people.push({
      name: person.name,
      blocked: blocked > 0,
      noOneOnOneDays:
        noOneOnOneDays !== null && noOneOnOneDays >= NO_1ON1_DAYS ? noOneOnOneDays : null,
      updateCount,
    });
  }

  return computeWeeklyReview({
    projectsAdvancedCount,
    milestonesCompletedCount,
    publicationStageChanges,
    needsAttention,
    decisionsResolved,
    people,
    nextWeek,
  });
}

export interface WeeklyReviewRepository {
  /** Computes a live snapshot for the current week without saving it. */
  preview(
    now?: Date,
  ): Promise<{ weekStart: string; weekEnd: string; snapshot: WeeklyReviewSnapshot }>;
  save(weekStart: string, weekEnd: string, snapshot: WeeklyReviewSnapshot): Promise<WeeklyReview>;
  list(): Promise<Pick<WeeklyReview, "id" | "week_start" | "week_end" | "created_at">[]>;
  get(weekStart: string): Promise<WeeklyReview | null>;
}

export const weeklyReviewRepository: WeeklyReviewRepository = {
  async preview(now = new Date()) {
    const { weekStart, weekEnd } = getWeekRange(now);
    const snapshot = await generateWeeklyReviewSnapshot(weekStart, weekEnd);
    return { weekStart, weekEnd, snapshot };
  },

  async save(weekStart, weekEnd, snapshot) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into weekly_reviews (id, week_start, week_end, snapshot_json, created_at) values (?, ?, ?, ?, ?)
       on conflict(week_start) do update set week_end = excluded.week_end, snapshot_json = excluded.snapshot_json, created_at = excluded.created_at`,
      [id, weekStart, weekEnd, JSON.stringify(snapshot), now],
    );
    const saved = await weeklyReviewRepository.get(weekStart);
    if (!saved) throw new Error("Failed to save weekly review");
    return saved;
  },

  async list() {
    const db = await getDb();
    return db.select<Pick<WeeklyReview, "id" | "week_start" | "week_end" | "created_at">[]>(
      "select id, week_start, week_end, created_at from weekly_reviews order by week_start desc",
    );
  },

  async get(weekStart) {
    const db = await getDb();
    const rows = await db.select<
      {
        id: string;
        week_start: string;
        week_end: string;
        snapshot_json: string;
        created_at: string;
      }[]
    >("select * from weekly_reviews where week_start = ?", [weekStart]);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      week_start: row.week_start,
      week_end: row.week_end,
      snapshot: JSON.parse(row.snapshot_json),
      created_at: row.created_at,
    };
  },
};
