import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Entirely manual — only ever called from a PI-initiated "Check for
 * Updates" click (see SettingsPage). Never runs on launch or on a timer,
 * so it cannot affect the app's offline-first guarantee: with no network,
 * this just rejects/returns null like any other failed fetch, and the rest
 * of the app is completely unaffected either way.
 */
export async function checkForUpdate(): Promise<Update | null> {
  return check();
}

/** Downloads, installs, and restarts the app onto the new version. */
export async function installUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await relaunch();
}
