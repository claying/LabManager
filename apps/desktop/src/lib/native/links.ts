import { openUrl } from "@tauri-apps/plugin-opener";

/** Opens an external URL (GitHub, Overleaf, Drive, …) in the user's default browser. */
export async function openExternalLink(url: string): Promise<void> {
  await openUrl(url);
}
