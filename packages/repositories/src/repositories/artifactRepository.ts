import type { Artifact, ArtifactInsert, ArtifactUpdatePatch } from "@pi-os/types";
import { getDb } from "../db/client";
import { buildSetClause, newId, nowIso } from "../db/util";

export interface ArtifactRepository {
  listForProject(projectId: string): Promise<Artifact[]>;
  create(input: ArtifactInsert): Promise<Artifact>;
  update(id: string, patch: ArtifactUpdatePatch): Promise<Artifact>;
  remove(id: string): Promise<void>;
}

export const artifactRepository: ArtifactRepository = {
  async listForProject(projectId) {
    const db = await getDb();
    return db.select<Artifact[]>(
      "select * from artifacts where project_id = ? order by created_at desc",
      [projectId],
    );
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into artifacts (id, project_id, type, title, local_path, url, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        input.project_id,
        input.type,
        input.title,
        input.local_path ?? null,
        input.url ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Artifact[]>("select * from artifacts where id = ?", [id]);
    return rows[0]!;
  },

  async update(id, patch) {
    const db = await getDb();
    const { clause, values } = buildSetClause(patch);
    if (clause) await db.execute(`update artifacts set ${clause} where id = ?`, [...values, id]);
    const rows = await db.select<Artifact[]>("select * from artifacts where id = ?", [id]);
    if (!rows[0]) throw new Error("Artifact not found");
    return rows[0];
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from artifacts where id = ?", [id]);
  },
};
