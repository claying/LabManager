import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join } from "@tauri-apps/api/path";

const DB_FILENAME = "pi-research-os.db";
const DB_URL = `sqlite:${DB_FILENAME}`;

let dbPromise: Promise<Database> | null = null;

/**
 * Lazily opens (and migrates — see apps/desktop/src-tauri/src/lib.rs) the
 * single SQLite connection this app ever needs. There is exactly one
 * workspace and one database file, so a shared singleton connection is the
 * right model — no per-request client parameter needed anywhere.
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

/** Resolves the absolute on-disk path of the SQLite file (tauri-plugin-sql resolves `sqlite:` URLs against the app data dir). */
export async function getDbFilePath(): Promise<string> {
  return join(await appDataDir(), DB_FILENAME);
}

/**
 * Closes the active connection and clears the singleton so the next
 * getDb() call reopens (and re-runs migrations against) the file on disk.
 * Only used by restore-backup, which replaces that file out from under us.
 */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.close();
    dbPromise = null;
  }
}
