import type { MemoryEvent, MemoryEventType } from "@pi-os/types";
import { getDb } from "../db/client";

/**
 * Research Memory is entirely derived — no events table. Every branch below
 * reads an existing authoritative table; nothing is duplicated or synced.
 * `person_id` is only populated where a person is *directly* recorded on
 * the source row (decision context person, update author, milestone owner,
 * a publication's first author, a grant's PI) — meeting attendance and
 * other many-valued relationships aren't flattened into a single person
 * column here, so filtering Memory by a person won't surface meetings they
 * merely attended. That's a deliberate scope boundary, not an oversight.
 */
const MEMORY_UNION_SQL = `
  select 'decision' as type, d.id as id, coalesce(d.resolved_at, d.created_at) as date,
         coalesce(d.decision, d.title) as title, d.rationale as summary,
         d.project_id as project_id, d.person_id as person_id
  from decision_requests d
  union all
  select 'meeting' as type, m.id as id, m.meeting_date as date,
         m.title as title, coalesce(m.results, m.progress) as summary,
         m.project_id as project_id,
         (select ma.person_id from meeting_attendees ma where ma.meeting_id = m.id order by ma.id limit 1) as person_id
  from meetings m
  union all
  select 'update' as type, u.id as id, u.created_at as date,
         u.summary as title, u.progress as summary,
         u.project_id as project_id, u.author_person_id as person_id
  from project_updates u
  union all
  select 'evidence' as type, e.id as id, e.created_at as date,
         e.summary as title, e.direction as summary,
         e.project_id as project_id, null as person_id
  from evidence e
  union all
  select 'milestone' as type, ms.id as id, ms.completed_at as date,
         ms.title as title, null as summary,
         ms.project_id as project_id, ms.owner_person_id as person_id
  from milestones ms
  where ms.status = 'completed' and ms.completed_at is not null
  union all
  select 'stage_change' as type, h.id as id, h.changed_at as date,
         h.to_stage as title, h.from_stage as summary,
         h.project_id as project_id, null as person_id
  from project_stage_history h
  union all
  select 'hypothesis' as type, hy.id as id, coalesce(hy.resolved_at, hy.created_at) as date,
         hy.statement as title, hy.status as summary,
         hy.project_id as project_id, null as person_id
  from hypotheses hy
  union all
  select 'publication' as type, p.id as id, p.created_at as date,
         p.title as title, p.venue as summary,
         p.project_id as project_id,
         (select pa.person_id from publication_authors pa where pa.publication_id = p.id order by pa.author_order limit 1) as person_id
  from publications p
  union all
  select 'grant' as type, g.id as id, g.created_at as date,
         g.title as title, g.funder as summary,
         (select gp.project_id from grant_projects gp where gp.grant_id = g.id limit 1) as project_id,
         g.pi_person_id as person_id
  from grants g
  union all
  select 'idea' as type, i.id as id, i.created_at as date,
         i.title as title, null as summary,
         i.related_project_id as project_id, null as person_id
  from ideas i
`;

interface MemoryRow {
  type: MemoryEventType;
  id: string;
  date: string | null;
  title: string;
  summary: string | null;
  project_id: string | null;
  person_id: string | null;
  project_title: string | null;
  person_name: string | null;
}

function mapRow(row: MemoryRow): MemoryEvent {
  return {
    type: row.type,
    id: row.id,
    date: row.date!,
    title: row.title,
    summary: row.summary,
    project_id: row.project_id,
    project_title: row.project_title,
    person_id: row.person_id,
    person_name: row.person_name,
  };
}

export interface MemoryFilters {
  projectId?: string;
  personId?: string;
  types?: MemoryEventType[];
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryContext {
  before: MemoryEvent[];
  current: MemoryEvent | null;
  after: MemoryEvent[];
}

export interface MemoryRepository {
  list(filters?: MemoryFilters): Promise<MemoryEvent[]>;
  /** The event itself plus up to `around` neighboring events on each side, scoped to the same project when the event has one. */
  getContext(type: MemoryEventType, id: string, around?: number): Promise<MemoryContext>;
}

export const memoryRepository: MemoryRepository = {
  async list(filters = {}) {
    const db = await getDb();
    const conditions: string[] = ["m.date is not null"];
    const params: unknown[] = [];
    if (filters.projectId) {
      conditions.push("m.project_id = ?");
      params.push(filters.projectId);
    }
    if (filters.personId) {
      conditions.push("m.person_id = ?");
      params.push(filters.personId);
    }
    if (filters.types && filters.types.length > 0) {
      conditions.push(`m.type in (${filters.types.map(() => "?").join(",")})`);
      params.push(...filters.types);
    }
    if (filters.after) {
      conditions.push("m.date >= ?");
      params.push(filters.after);
    }
    if (filters.before) {
      conditions.push("m.date <= ?");
      params.push(filters.before);
    }
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = await db.select<MemoryRow[]>(
      `select m.*, pr.title as project_title, pe.name as person_name
       from (${MEMORY_UNION_SQL}) m
       left join projects pr on pr.id = m.project_id
       left join people pe on pe.id = m.person_id
       where ${conditions.join(" and ")}
       order by m.date desc
       limit ? offset ?`,
      [...params, limit, offset],
    );
    return rows.map(mapRow);
  },

  async getContext(type, id, around = 3) {
    const db = await getDb();
    const selfRows = await db.select<MemoryRow[]>(
      `select m.*, pr.title as project_title, pe.name as person_name
       from (${MEMORY_UNION_SQL}) m
       left join projects pr on pr.id = m.project_id
       left join people pe on pe.id = m.person_id
       where m.type = ? and m.id = ?`,
      [type, id],
    );
    const current = selfRows[0] ? mapRow(selfRows[0]) : null;
    if (!current) return { before: [], current: null, after: [] };

    const scopeClause = current.project_id ? "and m.project_id = ?" : "";
    const scopeParams = current.project_id ? [current.project_id] : [];

    const beforeRows = await db.select<MemoryRow[]>(
      `select m.*, pr.title as project_title, pe.name as person_name
       from (${MEMORY_UNION_SQL}) m
       left join projects pr on pr.id = m.project_id
       left join people pe on pe.id = m.person_id
       where m.date is not null and m.date < ? ${scopeClause}
       order by m.date desc
       limit ?`,
      [current.date, ...scopeParams, around],
    );
    const afterRows = await db.select<MemoryRow[]>(
      `select m.*, pr.title as project_title, pe.name as person_name
       from (${MEMORY_UNION_SQL}) m
       left join projects pr on pr.id = m.project_id
       left join people pe on pe.id = m.person_id
       where m.date is not null and m.date > ? ${scopeClause}
       order by m.date asc
       limit ?`,
      [current.date, ...scopeParams, around],
    );

    return {
      before: beforeRows.map(mapRow).reverse(),
      current,
      after: afterRows.map(mapRow),
    };
  },
};
