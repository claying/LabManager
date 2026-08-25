import type {
  DecisionRequest,
  DecisionRequestInsert,
  DecisionRequestUpdatePatch,
  DecisionRequestWithRelations,
  PersonRole,
} from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso, toJsonArray, fromJsonArray } from "../db/util";

interface DecisionRequestRow extends DecisionRequest {
  project_title: string | null;
  person_name: string | null;
  person_avatar_url: string | null;
  person_role: string | null;
}

function mapRow(row: DecisionRequestRow): DecisionRequestWithRelations {
  const { project_title, person_name, person_avatar_url, person_role, options_json, ...rest } = row;
  return {
    ...rest,
    options: fromJsonArray(options_json),
    project:
      rest.project_id && project_title ? { id: rest.project_id, title: project_title } : null,
    person:
      rest.person_id && person_name
        ? {
            id: rest.person_id,
            name: person_name,
            avatar_url: person_avatar_url,
            role: person_role as PersonRole,
          }
        : null,
  };
}

const SELECT = `
  select d.*, pr.title as project_title, pe.name as person_name, pe.avatar_url as person_avatar_url, pe.role as person_role
  from decision_requests d
  left join projects pr on pr.id = d.project_id
  left join people pe on pe.id = d.person_id
`;

export interface DecisionRequestRepository {
  list(opts?: {
    status?: DecisionRequest["status"];
    projectId?: string;
  }): Promise<DecisionRequestWithRelations[]>;
  get(id: string): Promise<DecisionRequestWithRelations | null>;
  create(input: DecisionRequestInsert): Promise<DecisionRequest>;
  update(id: string, patch: DecisionRequestUpdatePatch): Promise<DecisionRequest>;
  resolve(id: string, decision: string, rationale: string | null): Promise<DecisionRequest>;
  defer(id: string): Promise<DecisionRequest>;
  remove(id: string): Promise<void>;
}

export const decisionRequestRepository: DecisionRequestRepository = {
  async list(opts = {}) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (opts.status) {
      clauses.push("d.status = ?");
      values.push(opts.status);
    }
    if (opts.projectId) {
      clauses.push("d.project_id = ?");
      values.push(opts.projectId);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const db = await getDb();
    const rows = await db.select<DecisionRequestRow[]>(
      `${SELECT} ${where} order by d.status = 'open' desc, d.priority = 'urgent' desc, d.created_at desc`,
      values,
    );
    return rows.map(mapRow);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<DecisionRequestRow[]>(`${SELECT} where d.id = ?`, [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into decision_requests (id, project_id, person_id, title, context, options_json, recommendation, priority, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id ?? null,
        input.person_id ?? null,
        input.title,
        input.context ?? null,
        toJsonArray(input.options ?? []),
        input.recommendation ?? null,
        input.priority ?? "normal",
        now,
        now,
      ],
    );
    const rows = await db.select<DecisionRequest[]>(
      "select * from decision_requests where id = ?",
      [id],
    );
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause)
      await db.execute(`update decision_requests set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<DecisionRequest[]>(
      "select * from decision_requests where id = ?",
      [id],
    );
    if (!rows[0]) throw new Error("Decision request not found");
    return rows[0];
  },

  async resolve(id, decision, rationale) {
    return decisionRequestRepository.update(id, {
      decision,
      rationale: rationale ?? null,
      status: "resolved",
      resolved_at: nowIso(),
    });
  },

  async defer(id) {
    return decisionRequestRepository.update(id, { status: "deferred" });
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from decision_requests where id = ?", [id]);
  },
};
