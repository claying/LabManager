import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

/** Opens a file or folder with the OS default handler. */
export async function openFileOrFolder(path: string): Promise<void> {
  await openPath(path);
}

/** Reveals a file/folder in Finder (macOS) / Explorer (Windows) / the default file manager (Linux). */
export async function revealInFileManager(path: string): Promise<void> {
  await revealItemInDir(path);
}
