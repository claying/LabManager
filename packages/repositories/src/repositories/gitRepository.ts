import { invoke } from "@tauri-apps/api/core";

export interface GitInfo {
  branch: string;
  last_commit_sha: string;
  last_commit_message: string;
  last_commit_at: string;
  has_uncommitted_changes: boolean;
}

/**
 * Lightweight local git metadata (SPEC_followup section 19) for a project's
 * git_repository_path. Backed by the `get_git_info` Rust command, which uses
 * the `git2` library directly (no shell, no GitHub). Returns null rather
 * than throwing when the path isn't a git repository, so callers can just
 * hide the git panel.
 */
export async function getGitInfo(path: string): Promise<GitInfo | null> {
  try {
    return await invoke<GitInfo>("get_git_info", { path });
  } catch {
    return null;
  }
}
