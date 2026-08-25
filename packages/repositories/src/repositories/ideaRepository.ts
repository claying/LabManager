import type { Idea, IdeaInsert, IdeaUpdatePatch, IdeaWithRelations } from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso, toJsonArray, fromJsonArray } from "../db/util";

interface IdeaRow extends Idea {
  related_project_title: string | null;
  converted_project_title: string | null;
}

function mapRow(row: IdeaRow): IdeaWithRelations {
  const { related_project_title, converted_project_title, tags_json, ...rest } = row;
  return {
    ...rest,
    tags: fromJsonArray(tags_json),
    relatedProject:
      rest.related_project_id && related_project_title
        ? { id: rest.related_project_id, title: related_project_title }
        : null,
    convertedProject:
      rest.converted_project_id && converted_project_title
        ? { id: rest.converted_project_id, title: converted_project_title }
        : null,
  };
}

const SELECT = `
  select i.*, rp.title as related_project_title, cp.title as converted_project_title
  from ideas i
  left join projects rp on rp.id = i.related_project_id
  left join projects cp on cp.id = i.converted_project_id
`;

export interface IdeaRepository {
  list(opts?: { state?: Idea["state"] }): Promise<IdeaWithRelations[]>;
  get(id: string): Promise<IdeaWithRelations | null>;
  create(input: IdeaInsert): Promise<Idea>;
  update(id: string, patch: IdeaUpdatePatch): Promise<Idea>;
  /** Marks the idea converted and links it to a newly-created project. */
  markConverted(id: string, projectId: string): Promise<Idea>;
  remove(id: string): Promise<void>;
}

export const ideaRepository: IdeaRepository = {
  async list(opts = {}) {
    const db = await getDb();
    const where = opts.state ? "where i.state = ?" : "";
    const values = opts.state ? [opts.state] : [];
    const rows = await db.select<IdeaRow[]>(
      `${SELECT} ${where} order by i.created_at desc`,
      values,
    );
    return rows.map(mapRow);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<IdeaRow[]>(`${SELECT} where i.id = ?`, [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into ideas (id, title, related_project_id, tags_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.related_project_id ?? null, toJsonArray(input.tags ?? []), now, now],
    );
    const rows = await db.select<Idea[]>("select * from ideas where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const dbPatch: Record<string, unknown> = { ...patch };
    if (patch.tags !== undefined) {
      dbPatch.tags_json = toJsonArray(patch.tags);
      delete dbPatch.tags;
    }
    const { clause, values } = buildSetClause(dbPatch);
    if (clause) await db.execute(`update ideas set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Idea[]>("select * from ideas where id = ?", [id]);
    if (!rows[0]) throw new Error("Idea not found");
    return rows[0];
  },

  async markConverted(id, projectId) {
    return ideaRepository.update(id, { state: "converted", converted_project_id: projectId });
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from ideas where id = ?", [id]);
  },
};
