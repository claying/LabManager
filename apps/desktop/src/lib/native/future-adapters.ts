/**
 * Interfaces for local-research integrations the desktop app does NOT
 * implement yet (SPEC_followup.md section 21 scope exclusions) — launching
 * an editor/terminal against a linked folder, listing experiment run
 * folders, and a local LLM assistant. Defining the shape now means a future
 * Tauri command can fill these in without touching any UI code: pages would
 * depend on the interface, not a concrete implementation.
 *
 * Local file references, local git status, and local full-text search are
 * now implemented for real (see `@pi-os/repositories`'s attachmentRepository,
 * gitRepository, and searchRepository) and no longer belong here.
 *
 * Intentionally unimplemented. Do not wire these into any page yet.
 */

export interface EditorLauncherAdapter {
  openInVSCode(folderPath: string): Promise<void>;
  openInTerminal(folderPath: string): Promise<void>;
}

export interface LocalExperimentFolderAdapter {
  listRunFolders(projectId: string): Promise<{ name: string; path: string; modifiedAt: string }[]>;
}

export interface LocalLlmAdapter {
  isAvailable(): Promise<boolean>;
  summarize(text: string): Promise<string>;
}
