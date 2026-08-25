import { readDir, readFile, remove, writeFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { closeDb, getDb, getDbFilePath } from "../db/client";
import { settingsRepository } from "./settingsRepository";
import { workspaceRepository } from "./workspaceRepository";

const APP_VERSION = "0.1.0";
const CURRENT_SCHEMA_VERSION = 3;
const BACKUP_FORMAT_VERSION = 1;
const BACKUP_PREFIX = "research-os-backup-";
const BACKUP_SUFFIX = ".zip";

export interface BackupManifest {
  backup_format_version: number;
  app_version: string;
  created_at: string;
  workspace_name: string;
  database_schema_version: number;
}

export interface BackupResult {
  path: string;
  manifest: BackupManifest;
}

function backupFileName(date: Date): string {
  return `${BACKUP_PREFIX}${date.toISOString().slice(0, 10)}${BACKUP_SUFFIX}`;
}

/** Produces a clean, consistent standalone copy of the live database via SQLite's own VACUUM INTO — safer than a raw file copy of a database that may have an open connection. */
async function vacuumToBytes(): Promise<Uint8Array> {
  const db = await getDb();
  const tempPath = await getDbFilePath().then((p) => `${p}.vacuum-tmp`);
  if (await exists(tempPath)) await remove(tempPath);
  await db.execute("vacuum into ?", [tempPath]);
  const bytes = await readFile(tempPath);
  await remove(tempPath);
  return bytes;
}

async function buildManifest(): Promise<BackupManifest> {
  const workspace = await workspaceRepository.get();
  return {
    backup_format_version: BACKUP_FORMAT_VERSION,
    app_version: APP_VERSION,
    created_at: new Date().toISOString(),
    workspace_name: workspace?.name ?? "Untitled Workspace",
    database_schema_version: CURRENT_SCHEMA_VERSION,
  };
}

export interface BackupRepository {
  /** Creates `research-os-backup-YYYY-MM-DD.zip` in `directory` (manifest.json + database.sqlite). */
  createBackup(directory: string): Promise<BackupResult>;
  /** Runs createBackup only if today's backup doesn't already exist in the configured directory — used for the once-a-day automatic backup. */
  createAutomaticBackupIfDue(): Promise<BackupResult | null>;
  listBackups(directory: string): Promise<{ name: string; path: string; createdAt: string }[]>;
  pruneOldBackups(directory: string, keep: number): Promise<void>;
  /** Validates and restores a backup zip. Always backs up the CURRENT workspace first, so a bad restore is always recoverable. */
  restoreBackup(
    zipPath: string,
  ): Promise<{ manifest: BackupManifest; preRestoreBackupPath: string | null }>;
  validateBackup(zipPath: string): Promise<BackupManifest>;
  /**
   * Permanently deletes all local data and returns the app to first-run
   * onboarding. Backs up the current workspace first if a backup directory
   * is configured (the caller is responsible for warning the PI when one
   * isn't, since in that case this is unrecoverable).
   */
  resetWorkspace(): Promise<{ preResetBackupPath: string | null }>;
}

export const backupRepository: BackupRepository = {
  async createBackup(directory) {
    if (!(await exists(directory))) await mkdir(directory, { recursive: true });

    const [dbBytes, manifest] = await Promise.all([vacuumToBytes(), buildManifest()]);
    const zipped = zipSync(
      {
        "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
        "database.sqlite": dbBytes,
      },
      { level: 6 },
    );

    const fileName = backupFileName(new Date());
    const path = `${directory}/${fileName}`;
    await writeFile(path, zipped);
    await settingsRepository.setLastBackupAt(manifest.created_at);

    return { path, manifest };
  },

  async createAutomaticBackupIfDue() {
    const directory = await settingsRepository.getBackupDirectory();
    if (!directory) return null;

    const today = new Date().toISOString().slice(0, 10);
    const existingToday = `${directory}/${backupFileName(new Date())}`;
    if (await exists(existingToday)) return null;

    const lastBackupAt = await settingsRepository.getLastBackupAt();
    if (lastBackupAt && lastBackupAt.slice(0, 10) === today) return null;

    const result = await backupRepository.createBackup(directory);
    const retention = await settingsRepository.getBackupRetentionDays();
    await backupRepository.pruneOldBackups(directory, retention);
    return result;
  },

  async listBackups(directory) {
    if (!(await exists(directory))) return [];
    const entries = await readDir(directory);
    return entries
      .filter((e) => e.name?.startsWith(BACKUP_PREFIX) && e.name.endsWith(BACKUP_SUFFIX))
      .map((e) => ({
        name: e.name!,
        path: `${directory}/${e.name}`,
        createdAt: e.name!.slice(BACKUP_PREFIX.length, BACKUP_PREFIX.length + 10),
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async pruneOldBackups(directory, keep) {
    const backups = await backupRepository.listBackups(directory);
    const toDelete = backups.slice(keep);
    for (const backup of toDelete) {
      await remove(backup.path);
    }
  },

  async validateBackup(zipPath) {
    const bytes = await readFile(zipPath);
    const files = unzipSync(bytes);
    const manifestBytes = files["manifest.json"];
    const dbBytes = files["database.sqlite"];
    if (!manifestBytes || !dbBytes) {
      throw new Error(
        "This file doesn't look like a PI Research OS backup (missing manifest.json or database.sqlite).",
      );
    }
    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(strFromU8(manifestBytes));
    } catch {
      throw new Error("This backup's manifest.json is corrupted and can't be read.");
    }
    if (manifest.backup_format_version > BACKUP_FORMAT_VERSION) {
      throw new Error(
        `This backup was created by a newer version of the app (format v${manifest.backup_format_version}) and can't be restored here.`,
      );
    }
    return manifest;
  },

  async restoreBackup(zipPath) {
    const manifest = await backupRepository.validateBackup(zipPath);
    const bytes = await readFile(zipPath);
    const files = unzipSync(bytes);
    const dbBytes = files["database.sqlite"]!;

    // Always back up the current workspace before overwriting it — never
    // leave the PI without a recovery path if the restore turns out wrong.
    let preRestoreBackupPath: string | null = null;
    const directory = await settingsRepository.getBackupDirectory();
    if (directory) {
      const pre = await backupRepository.createBackup(directory);
      preRestoreBackupPath = pre.path;
    }

    await closeDb();
    const dbPath = await getDbFilePath();
    await writeFile(dbPath, dbBytes);
    // Reopening via getDb() elsewhere re-triggers tauri-plugin-sql's
    // migration check, safely forward-migrating an older backup if needed.

    return { manifest, preRestoreBackupPath };
  },

  async resetWorkspace() {
    let preResetBackupPath: string | null = null;
    const directory = await settingsRepository.getBackupDirectory();
    if (directory) {
      const pre = await backupRepository.createBackup(directory);
      preResetBackupPath = pre.path;
    }

    // Clears every table in place on the SAME live connection, instead of
    // deleting the file and reopening/relaunching: tauri-plugin-sql only
    // runs a database's registered migrations once per process lifetime
    // (see commands.rs::load), so a reopened connection finds none left to
    // run and opens an unmigrated, empty file. Truncating in place keeps
    // the existing schema intact, so nothing needs to reload or relaunch —
    // the caller just invalidates queries and the app's own "no workspace"
    // routing gate takes it back to onboarding reactively.
    const db = await getDb();
    const tables = await db.select<{ name: string }[]>(
      `select name from sqlite_master
       where type = 'table'
         and name not like 'sqlite_%'
         and name != '_sqlx_migrations'
         and name not like 'search_index%'`,
    );

    await db.execute("pragma foreign_keys = off");
    try {
      await db.execute("begin");
      for (const { name } of tables) {
        await db.execute(`delete from "${name}"`);
      }
      await db.execute("commit");
    } catch (error) {
      await db.execute("rollback");
      throw error;
    } finally {
      await db.execute("pragma foreign_keys = on");
    }
    await db.execute("vacuum");

    return { preResetBackupPath };
  },
};
