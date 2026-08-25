import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

/** Native folder picker — used for backup directory, and project research/git/paper/results folders. Returns null if cancelled. */
export async function pickFolder(title?: string): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, title });
  return typeof result === "string" ? result : null;
}

/** Native file picker — used for file attachments on projects/meetings/publications/grants. Returns null if cancelled. */
export async function pickFile(title?: string): Promise<string | null> {
  const result = await open({ directory: false, multiple: false, title });
  return typeof result === "string" ? result : null;
}

/** Native "open" dialog scoped to backup zip files, for Restore Backup. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: "Choose a backup to restore",
    filters: [{ name: "PI Research OS Backup", extensions: ["zip"] }],
  });
  return typeof result === "string" ? result : null;
}

/** Native "save" dialog + write — used for JSON/CSV/Markdown exports. Returns the saved path, or null if cancelled. */
export async function saveTextFile(
  content: string,
  opts: { defaultName: string; extension: string },
): Promise<string | null> {
  const path = await save({
    defaultPath: opts.defaultName,
    filters: [{ name: opts.extension.toUpperCase(), extensions: [opts.extension] }],
  });
  if (!path) return null;
  await writeTextFile(path, content);
  return path;
}
