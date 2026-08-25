import type { Favorite, FavoriteEntityType } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

export interface FavoriteWithTitle extends Favorite {
  title: string;
}

const TITLE_TABLE: Record<FavoriteEntityType, { table: string; column: string }> = {
  project: { table: "projects", column: "title" },
  person: { table: "people", column: "name" },
  publication: { table: "publications", column: "title" },
  saved_view: { table: "saved_views", column: "name" },
};

export interface FavoriteRepository {
  list(entityType?: FavoriteEntityType): Promise<Favorite[]>;
  /** Same as list(), but resolves each entity's display title (dropping favorites whose target was deleted). */
  listWithTitles(entityType?: FavoriteEntityType): Promise<FavoriteWithTitle[]>;
  isFavorite(entityType: FavoriteEntityType, entityId: string): Promise<boolean>;
  toggle(entityType: FavoriteEntityType, entityId: string): Promise<boolean>;
}

export const favoriteRepository: FavoriteRepository = {
  async list(entityType) {
    const db = await getDb();
    return entityType
      ? db.select<Favorite[]>(
          "select * from favorites where entity_type = ? order by created_at desc",
          [entityType],
        )
      : db.select<Favorite[]>("select * from favorites order by created_at desc");
  },

  async listWithTitles(entityType) {
    const db = await getDb();
    const favorites = await favoriteRepository.list(entityType);
    const result: FavoriteWithTitle[] = [];
    for (const f of favorites) {
      const { table, column } = TITLE_TABLE[f.entity_type];
      const rows = await db.select<Record<string, string>[]>(
        `select ${column} as title from ${table} where id = ?`,
        [f.entity_id],
      );
      if (rows[0]?.title) result.push({ ...f, title: rows[0].title });
    }
    return result;
  },

  async isFavorite(entityType, entityId) {
    const db = await getDb();
    const rows = await db.select<{ id: string }[]>(
      "select id from favorites where entity_type = ? and entity_id = ?",
      [entityType, entityId],
    );
    return rows.length > 0;
  },

  async toggle(entityType, entityId) {
    const db = await getDb();
    const isFav = await favoriteRepository.isFavorite(entityType, entityId);
    if (isFav) {
      await db.execute("delete from favorites where entity_type = ? and entity_id = ?", [
        entityType,
        entityId,
      ]);
      return false;
    }
    await db.execute(
      "insert into favorites (id, entity_type, entity_id, created_at) values (?, ?, ?, ?)",
      [newId(), entityType, entityId, nowIso()],
    );
    return true;
  },
};
