import type { ProjectRelation, ProjectRelationInsert, ProjectRelationType } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

export interface ProjectRelationRow extends ProjectRelation {
  direction: "outgoing" | "incoming";
  other_project: { id: string; title: string; short_name: string | null };
}

export interface ProjectRelationRepository {
  /** Both directions: relations this project declares, and relations other projects declare pointing at it. */
  listForProject(projectId: string): Promise<ProjectRelationRow[]>;
  create(input: ProjectRelationInsert): Promise<ProjectRelation>;
  remove(id: string): Promise<void>;
}

export const projectRelationRepository: ProjectRelationRepository = {
  async listForProject(projectId) {
    const db = await getDb();
    const outgoing = await db.select<
      (ProjectRelation & { other_title: string; other_short_name: string | null })[]
    >(
      `select r.*, p.title as other_title, p.short_name as other_short_name
       from project_relations r
       join projects p on p.id = r.related_project_id
       where r.project_id = ?
       order by r.created_at desc`,
      [projectId],
    );
    const incoming = await db.select<
      (ProjectRelation & { other_title: string; other_short_name: string | null })[]
    >(
      `select r.*, p.title as other_title, p.short_name as other_short_name
       from project_relations r
       join projects p on p.id = r.project_id
       where r.related_project_id = ?
       order by r.created_at desc`,
      [projectId],
    );
    const map = (
      row: ProjectRelation & { other_title: string; other_short_name: string | null },
      direction: "outgoing" | "incoming",
    ): ProjectRelationRow => {
      const { other_title, other_short_name, ...r } = row;
      const otherId = direction === "outgoing" ? r.related_project_id : r.project_id;
      return {
        ...r,
        direction,
        other_project: { id: otherId, title: other_title, short_name: other_short_name },
      };
    };
    return [...outgoing.map((r) => map(r, "outgoing")), ...incoming.map((r) => map(r, "incoming"))];
  },

  async create(input) {
    const db = await getDb();
    if (input.project_id === input.related_project_id) {
      throw new Error("A project can't be related to itself.");
    }
    const id = newId();
    await db.execute(
      "insert into project_relations (id, project_id, related_project_id, relation_type, notes, created_at) values (?, ?, ?, ?, ?, ?)",
      [
        id,
        input.project_id,
        input.related_project_id,
        input.relation_type satisfies ProjectRelationType,
        input.notes ?? null,
        nowIso(),
      ],
    );
    const rows = await db.select<ProjectRelation[]>(
      "select * from project_relations where id = ?",
      [id],
    );
    return rows[0]!;
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from project_relations where id = ?", [id]);
  },
};
