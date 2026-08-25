import type {
  Venue,
  VenueCycle,
  VenueCycleInsert,
  VenueCycleUpdatePatch,
  VenueCycleWithVenue,
  VenueInsert,
  VenueUpdatePatch,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface VenueRepository {
  list(): Promise<Venue[]>;
  create(input: VenueInsert): Promise<Venue>;
  update(id: string, patch: VenueUpdatePatch): Promise<Venue>;
  remove(id: string): Promise<void>;
}

export const venueRepository: VenueRepository = {
  async list() {
    const db = await getDb();
    return db.select<Venue[]>("select * from venues order by name asc");
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into venues (id, name, short_name, category, website_url, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        input.name,
        input.short_name ?? null,
        input.category ?? "conference",
        input.website_url ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Venue[]>("select * from venues where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update venues set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Venue[]>("select * from venues where id = ?", [id]);
    if (!rows[0]) throw new Error("Venue not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from venues where id = ?", [id]);
  },
};

const CYCLE_SELECT = `
  select vc.*, v.name as venue_name, v.short_name as venue_short_name, v.category as venue_category
  from venue_cycles vc
  join venues v on v.id = vc.venue_id
`;

interface CycleRow extends VenueCycle {
  venue_name: string;
  venue_short_name: string | null;
  venue_category: Venue["category"];
}

function mapCycleRow(row: CycleRow): VenueCycleWithVenue {
  const { venue_name, venue_short_name, venue_category, ...cycle } = row;
  return {
    ...cycle,
    venue: {
      id: cycle.venue_id,
      name: venue_name,
      short_name: venue_short_name,
      category: venue_category,
    },
  };
}

export interface VenueCycleRepository {
  list(opts?: { upcomingOnly?: boolean }): Promise<VenueCycleWithVenue[]>;
  get(id: string): Promise<VenueCycleWithVenue | null>;
  create(input: VenueCycleInsert): Promise<VenueCycle>;
  update(id: string, patch: VenueCycleUpdatePatch): Promise<VenueCycle>;
  remove(id: string): Promise<void>;
}

export const venueCycleRepository: VenueCycleRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const where = opts.upcomingOnly
      ? "where coalesce(vc.submission_deadline, vc.abstract_deadline, vc.event_start) >= date('now')"
      : "";
    const rows = await db.select<CycleRow[]>(
      `${CYCLE_SELECT} ${where} order by coalesce(vc.submission_deadline, vc.abstract_deadline, vc.event_start) asc`,
    );
    return rows.map(mapCycleRow);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<CycleRow[]>(`${CYCLE_SELECT} where vc.id = ?`, [id]);
    return rows[0] ? mapCycleRow(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into venue_cycles
        (id, venue_id, cycle_label, abstract_deadline, submission_deadline, rebuttal_start, rebuttal_end, notification_date, camera_ready_date, event_start, event_end, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.venue_id,
        input.cycle_label,
        input.abstract_deadline ?? null,
        input.submission_deadline ?? null,
        input.rebuttal_start ?? null,
        input.rebuttal_end ?? null,
        input.notification_date ?? null,
        input.camera_ready_date ?? null,
        input.event_start ?? null,
        input.event_end ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<VenueCycle[]>("select * from venue_cycles where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update venue_cycles set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<VenueCycle[]>("select * from venue_cycles where id = ?", [id]);
    if (!rows[0]) throw new Error("Venue cycle not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from venue_cycles where id = ?", [id]);
  },
};
