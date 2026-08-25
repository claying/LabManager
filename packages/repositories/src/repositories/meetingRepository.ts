import type { Meeting, MeetingUpdatePatch, MeetingWithRelations, PersonRole } from "@pi-os/types";
import type { MeetingInput } from "@pi-os/domain";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface MeetingRepository {
  list(opts?: { projectId?: string; limit?: number }): Promise<MeetingWithRelations[]>;
  get(id: string): Promise<MeetingWithRelations | null>;
  create(createdBy: string | null, input: MeetingInput): Promise<Meeting>;
  update(id: string, patch: MeetingUpdatePatch): Promise<Meeting>;
  setAttendees(meetingId: string, personIds: string[]): Promise<void>;
  remove(id: string): Promise<void>;
}

interface RawMeetingRow extends Meeting {
  project_title: string | null;
}

async function attachRelations(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: RawMeetingRow[],
): Promise<MeetingWithRelations[]> {
  const result: MeetingWithRelations[] = [];
  for (const row of rows) {
    const { project_title, ...meeting } = row;
    const attendeeRows = await db.select<
      { id: string; name: string; avatar_url: string | null; role: string }[]
    >(
      `select p.id, p.name, p.avatar_url, p.role
       from meeting_attendees ma
       join people p on p.id = ma.person_id
       where ma.meeting_id = ?`,
      [meeting.id],
    );
    result.push({
      ...meeting,
      project:
        meeting.project_id && project_title
          ? { id: meeting.project_id, title: project_title }
          : null,
      attendees: attendeeRows.map((a) => ({ ...a, role: a.role as PersonRole })),
    });
  }
  return result;
}

export const meetingRepository: MeetingRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (opts.projectId) {
      clauses.push("m.project_id = ?");
      values.push(opts.projectId);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const limit = opts.limit ? `limit ${Number(opts.limit)}` : "";
    const rows = await db.select<RawMeetingRow[]>(
      `select m.*, pr.title as project_title
       from meetings m
       left join projects pr on pr.id = m.project_id
       ${where}
       order by m.meeting_date desc
       ${limit}`,
      values,
    );
    return attachRelations(db, rows);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<RawMeetingRow[]>(
      `select m.*, pr.title as project_title from meetings m left join projects pr on pr.id = m.project_id where m.id = ?`,
      [id],
    );
    if (!rows[0]) return null;
    return (await attachRelations(db, rows))[0]!;
  },

  async create(_createdBy, input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into meetings (id, project_id, title, meeting_type, meeting_date, progress, results, blockers, decisions, next_steps, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id ?? null,
        input.title,
        input.meeting_type,
        input.meeting_date,
        input.progress ?? null,
        input.results ?? null,
        input.blockers ?? null,
        input.decisions ?? null,
        input.next_steps ?? null,
        now,
        now,
      ],
    );
    if (input.attendee_person_ids.length > 0) {
      await meetingRepository.setAttendees(id, input.attendee_person_ids);
    }
    const rows = await db.select<Meeting[]>("select * from meetings where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update meetings set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Meeting[]>("select * from meetings where id = ?", [id]);
    if (!rows[0]) throw new Error("Meeting not found");
    return rows[0];
  },

  async setAttendees(meetingId, personIds) {
    const db = await getDb();
    await db.execute("delete from meeting_attendees where meeting_id = ?", [meetingId]);
    for (const personId of personIds) {
      await db.execute(
        "insert into meeting_attendees (id, meeting_id, person_id) values (?, ?, ?)",
        [newId(), meetingId, personId],
      );
    }
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from meetings where id = ?", [id]);
  },
};
