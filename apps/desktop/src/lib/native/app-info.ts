import { getVersion } from "@tauri-apps/api/app";

/** The actual running app's version, as set on `tauri.conf.json` at build time — never hardcoded in the frontend, so it can't go stale across releases. */
export async function getAppVersion(): Promise<string> {
  return getVersion();
}
