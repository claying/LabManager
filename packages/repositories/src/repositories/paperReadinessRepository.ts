import type { PaperReadinessItem, PaperReadinessStatus } from "@pi-os/types";
import { DEFAULT_PAPER_READINESS_ITEMS } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId } from "../db/util";

export interface PaperReadinessRepository {
  list(publicationId: string): Promise<PaperReadinessItem[]>;
  /** Idempotent — seeds the default checklist the first time a publication is opened, no-ops after. */
  ensureDefaults(publicationId: string): Promise<PaperReadinessItem[]>;
  setStatus(itemId: string, status: PaperReadinessStatus): Promise<PaperReadinessItem>;
  addItem(publicationId: string, label: string): Promise<PaperReadinessItem>;
  removeItem(itemId: string): Promise<void>;
}

export const paperReadinessRepository: PaperReadinessRepository = {
  async list(publicationId) {
    const db = await getDb();
    return db.select<PaperReadinessItem[]>(
      "select * from paper_readiness_items where publication_id = ? order by sort_order asc",
      [publicationId],
    );
  },

  async ensureDefaults(publicationId) {
    const db = await getDb();
    const existing = await paperReadinessRepository.list(publicationId);
    if (existing.length > 0) return existing;
    let order = 0;
    for (const label of DEFAULT_PAPER_READINESS_ITEMS) {
      await db.execute(
        "insert into paper_readiness_items (id, publication_id, label, sort_order) values (?, ?, ?, ?)",
        [newId(), publicationId, label, order++],
      );
    }
    return paperReadinessRepository.list(publicationId);
  },

  async setStatus(itemId, status) {
    const db = await getDb();
    await db.execute("update paper_readiness_items set status = ? where id = ?", [status, itemId]);
    const rows = await db.select<PaperReadinessItem[]>(
      "select * from paper_readiness_items where id = ?",
      [itemId],
    );
    if (!rows[0]) throw new Error("Readiness item not found");
    return rows[0];
  },

  async addItem(publicationId, label) {
    const db = await getDb();
    const maxOrder = (
      await db.select<{ n: number | null }[]>(
        "select max(sort_order) as n from paper_readiness_items where publication_id = ?",
        [publicationId],
      )
    )[0]?.n;
    const id = newId();
    await db.execute(
      "insert into paper_readiness_items (id, publication_id, label, sort_order) values (?, ?, ?, ?)",
      [id, publicationId, label, (maxOrder ?? -1) + 1],
    );
    const rows = await db.select<PaperReadinessItem[]>(
      "select * from paper_readiness_items where id = ?",
      [id],
    );
    return rows[0]!;
  },

  async removeItem(itemId) {
    const db = await getDb();
    await db.execute("delete from paper_readiness_items where id = ?", [itemId]);
  },
};
