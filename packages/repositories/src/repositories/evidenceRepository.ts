import type { Evidence, EvidenceInsert } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

export interface EvidenceRepository {
  list(hypothesisId: string): Promise<Evidence[]>;
  create(input: EvidenceInsert): Promise<Evidence>;
  remove(id: string): Promise<void>;
}

export const evidenceRepository: EvidenceRepository = {
  async list(hypothesisId) {
    const db = await getDb();
    return db.select<Evidence[]>(
      "select * from evidence where hypothesis_id = ? order by created_at desc",
      [hypothesisId],
    );
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      `insert into evidence (id, hypothesis_id, project_id, type, summary, direction, source_type, source_id, local_path, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.hypothesis_id,
        input.project_id,
        input.type ?? "observation",
        input.summary,
        input.direction ?? "supports",
        input.source_type ?? null,
        input.source_id ?? null,
        input.local_path ?? null,
        now,
        now,
      ],
    );
    const rows = await db.select<Evidence[]>("select * from evidence where id = ?", [id]);
    return rows[0]!;
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from evidence where id = ?", [id]);
  },
};
