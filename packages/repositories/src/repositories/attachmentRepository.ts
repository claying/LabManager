import type { Attachment, AttachmentEntityType, AttachmentInsert } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

export interface AttachmentRepository {
  list(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]>;
  create(input: AttachmentInsert): Promise<Attachment>;
  remove(id: string): Promise<void>;
}

export const attachmentRepository: AttachmentRepository = {
  async list(entityType, entityId) {
    const db = await getDb();
    return db.select<Attachment[]>(
      "select * from attachments where entity_type = ? and entity_id = ? order by created_at asc",
      [entityType, entityId],
    );
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into attachments (id, entity_type, entity_id, kind, label, path, created_at) values (?, ?, ?, ?, ?, ?, ?)",
      [id, input.entity_type, input.entity_id, input.kind, input.label ?? null, input.path, now],
    );
    const rows = await db.select<Attachment[]>("select * from attachments where id = ?", [id]);
    return rows[0]!;
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from attachments where id = ?", [id]);
  },
};
