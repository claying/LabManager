import type { SavedView, SavedViewEntityType, SavedViewInsert } from "@pi-os/types";
import { getDb } from "../db/client";
import { fromSqlBool, newId, nowIso, toSqlBool } from "../db/util";

interface SavedViewRow extends Omit<SavedView, "pinned"> {
  pinned: number;
}

function mapRow(row: SavedViewRow): SavedView {
  return { ...row, pinned: fromSqlBool(row.pinned) };
}

export interface SavedViewRepository {
  list(entityType?: SavedViewEntityType): Promise<SavedView[]>;
  create(input: SavedViewInsert): Promise<SavedView>;
  rename(id: string, name: string): Promise<SavedView>;
  setPinned(id: string, pinned: boolean): Promise<SavedView>;
  remove(id: string): Promise<void>;
}

export const savedViewRepository: SavedViewRepository = {
  async list(entityType) {
    const db = await getDb();
    const rows = entityType
      ? await db.select<SavedViewRow[]>(
          "select * from saved_views where entity_type = ? order by pinned desc, name asc",
          [entityType],
        )
      : await db.select<SavedViewRow[]>("select * from saved_views order by pinned desc, name asc");
    return rows.map(mapRow);
  },

  async create(input) {
    const db = await getDb();
    const id = newId();
    const now = nowIso();
    await db.execute(
      "insert into saved_views (id, name, entity_type, filters, pinned, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        input.name,
        input.entity_type,
        input.filters,
        toSqlBool(input.pinned ?? false),
        now,
        now,
      ],
    );
    const rows = await db.select<SavedViewRow[]>("select * from saved_views where id = ?", [id]);
    return mapRow(rows[0]!);
  },

  async rename(id, name) {
    const db = await getDb();
    await db.execute("update saved_views set name = ? where id = ?", [name, id]);
    const rows = await db.select<SavedViewRow[]>("select * from saved_views where id = ?", [id]);
    if (!rows[0]) throw new Error("Saved view not found");
    return mapRow(rows[0]);
  },

  async setPinned(id, pinned) {
    const db = await getDb();
    await db.execute("update saved_views set pinned = ? where id = ?", [toSqlBool(pinned), id]);
    const rows = await db.select<SavedViewRow[]>("select * from saved_views where id = ?", [id]);
    if (!rows[0]) throw new Error("Saved view not found");
    return mapRow(rows[0]);
  },

  async remove(id) {
    const db = await getDb();
    await db.execute("delete from saved_views where id = ?", [id]);
  },
};
