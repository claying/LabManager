import { readDir, readTextFile, stat } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type {
  FileIndexCategory,
  FileIndexEntry,
  FileIndexEntrySummary,
  FileIndexRoot,
} from "@pi-os/types";
import { INDEXABLE_TEXT_EXTENSIONS, FILE_INDEX_MAX_CONTENT_BYTES } from "@pi-os/types";
import { getDb } from "../db/client";
import { newId, nowIso } from "../db/util";

// Never walk into these regardless of how big/deep the selected folder is —
// build output, dependency, and VCS-internal directories are noise, not
// research artifacts, and can be enormous.
const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".turbo",
  ".next",
  "dist",
  "build",
  "target",
  ".cache",
  ".pytest_cache",
  ".mypy_cache",
]);

const MAX_FILES_PER_ROOT = 5000;
const MAX_DEPTH = 15;

interface WalkedFile {
  absolutePath: string;
  relativePath: string;
  name: string;
  extension: string | null;
}

async function walk(rootPath: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];

  async function visit(absoluteDir: string, relativeSegments: string[], depth: number) {
    if (results.length >= MAX_FILES_PER_ROOT || depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = await readDir(absoluteDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_FILES_PER_ROOT) return;
      if (entry.isSymlink) continue;
      if (entry.isDirectory) {
        if (entry.name.startsWith(".") || IGNORE_DIR_NAMES.has(entry.name)) continue;
        await visit(
          await join(absoluteDir, entry.name),
          [...relativeSegments, entry.name],
          depth + 1,
        );
      } else if (entry.isFile) {
        const dotIndex = entry.name.lastIndexOf(".");
        const extension = dotIndex > 0 ? entry.name.slice(dotIndex + 1).toLowerCase() : null;
        results.push({
          absolutePath: await join(absoluteDir, entry.name),
          relativePath: [...relativeSegments, entry.name].join("/"),
          name: entry.name,
          extension,
        });
      }
    }
  }

  await visit(rootPath, [], 0);
  return results;
}

export interface IndexResult {
  added: number;
  updated: number;
  removed: number;
}

export interface FileIndexRepository {
  listRoots(projectId: string): Promise<FileIndexRoot[]>;
  addRoot(
    projectId: string,
    category: FileIndexCategory,
    rootPath: string,
    label?: string | null,
  ): Promise<FileIndexRoot>;
  removeRoot(rootId: string): Promise<void>;
  /** Re-walks a root's folder on disk and reconciles file_index against it: adds new files, updates changed ones, removes deleted ones. */
  reindexRoot(rootId: string): Promise<IndexResult>;
  listFiles(
    projectId: string,
    opts?: { category?: FileIndexCategory; rootId?: string },
  ): Promise<FileIndexEntrySummary[]>;
  getFile(id: string): Promise<FileIndexEntry | null>;
}

export const fileIndexRepository: FileIndexRepository = {
  async listRoots(projectId) {
    const db = await getDb();
    return db.select<FileIndexRoot[]>(
      "select * from file_index_roots where project_id = ? order by created_at desc",
      [projectId],
    );
  },

  async addRoot(projectId, category, rootPath, label) {
    const db = await getDb();
    const id = newId();
    await db.execute(
      "insert into file_index_roots (id, project_id, category, root_path, label, created_at) values (?, ?, ?, ?, ?, ?)",
      [id, projectId, category, rootPath, label ?? null, nowIso()],
    );
    const rows = await db.select<FileIndexRoot[]>("select * from file_index_roots where id = ?", [
      id,
    ]);
    return rows[0]!;
  },

  async removeRoot(rootId) {
    const db = await getDb();
    await db.execute("delete from file_index_roots where id = ?", [rootId]);
  },

  async reindexRoot(rootId) {
    const db = await getDb();
    const roots = await db.select<FileIndexRoot[]>("select * from file_index_roots where id = ?", [
      rootId,
    ]);
    const root = roots[0];
    if (!root) throw new Error("Indexed folder not found");

    const onDisk = await walk(root.root_path);
    const existing = await db.select<
      { id: string; relative_path: string; size_bytes: number; modified_at: string | null }[]
    >("select id, relative_path, size_bytes, modified_at from file_index where root_id = ?", [
      rootId,
    ]);
    const existingByPath = new Map(existing.map((e) => [e.relative_path, e]));
    const onDiskPaths = new Set(onDisk.map((f) => f.relativePath));

    let added = 0;
    let updated = 0;
    let removed = 0;

    for (const file of onDisk) {
      let sizeBytes = 0;
      let modifiedAt: string | null = null;
      try {
        const info = await stat(file.absolutePath);
        sizeBytes = info.size;
        modifiedAt = info.mtime ? info.mtime.toISOString() : null;
      } catch {
        continue;
      }

      const prior = existingByPath.get(file.relativePath);
      const unchanged = prior && prior.size_bytes === sizeBytes && prior.modified_at === modifiedAt;
      if (unchanged) continue;

      let indexedBody: string | null = null;
      if (
        file.extension &&
        (INDEXABLE_TEXT_EXTENSIONS as readonly string[]).includes(file.extension) &&
        sizeBytes <= FILE_INDEX_MAX_CONTENT_BYTES
      ) {
        try {
          indexedBody = await readTextFile(file.absolutePath);
        } catch {
          indexedBody = null;
        }
      }

      if (prior) {
        await db.execute(
          "update file_index set name = ?, extension = ?, size_bytes = ?, modified_at = ?, indexed_body = ? where id = ?",
          [file.name, file.extension, sizeBytes, modifiedAt, indexedBody, prior.id],
        );
        updated++;
      } else {
        await db.execute(
          `insert into file_index
             (id, root_id, project_id, category, name, relative_path, extension, size_bytes, modified_at, indexed_body, created_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            rootId,
            root.project_id,
            root.category,
            file.name,
            file.relativePath,
            file.extension,
            sizeBytes,
            modifiedAt,
            indexedBody,
            nowIso(),
          ],
        );
        added++;
      }
    }

    for (const prior of existing) {
      if (!onDiskPaths.has(prior.relative_path)) {
        await db.execute("delete from file_index where id = ?", [prior.id]);
        removed++;
      }
    }

    await db.execute("update file_index_roots set last_indexed_at = ? where id = ?", [
      nowIso(),
      rootId,
    ]);

    return { added, updated, removed };
  },

  async listFiles(projectId, opts = {}) {
    const db = await getDb();
    const conditions = ["project_id = ?"];
    const params: unknown[] = [projectId];
    if (opts.category) {
      conditions.push("category = ?");
      params.push(opts.category);
    }
    if (opts.rootId) {
      conditions.push("root_id = ?");
      params.push(opts.rootId);
    }
    return db.select<FileIndexEntrySummary[]>(
      `select id, root_id, project_id, category, name, relative_path, extension, size_bytes, modified_at, created_at
       from file_index where ${conditions.join(" and ")} order by relative_path asc`,
      params,
    );
  },

  async getFile(id) {
    const db = await getDb();
    const rows = await db.select<FileIndexEntry[]>("select * from file_index where id = ?", [id]);
    return rows[0] ?? null;
  },
};
