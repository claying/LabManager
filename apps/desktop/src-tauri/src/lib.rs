// Intentionally thin. Per SPEC_followup.md sections 9/32, all business logic
// and persistence orchestration lives in TypeScript (packages/repositories,
// via tauri-plugin-sql's JS API); Rust here only wires up native OS
// capabilities: the SQLite connection + migrations, notifications, opening/
// revealing files, native pickers, remembered window state, and one narrow
// git-metadata command backed by a real git library (not a shell — see
// SPEC_followup section 32, "do not expose arbitrary shell execution").

use serde::Serialize;
use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add search (fts5)",
            sql: include_str!("../migrations/002_add_search.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add attachments",
            sql: include_str!("../migrations/003_add_attachments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "tier 1: inbox, decisions, ideas, timeline, weekly review",
            sql: include_str!("../migrations/004_tier1.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "tier 2: research questions, hypotheses, evidence, venues, submission planning, portfolio analytics",
            sql: include_str!("../migrations/005_tier2.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "tier 3: project relations, artifacts, file indexing, saved views, favorites, closeout",
            sql: include_str!("../migrations/006_tier3.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[derive(Serialize)]
struct GitCommitInfo {
    sha: String,
    message: String,
    committed_at: String,
}

#[derive(Serialize)]
struct GitInfo {
    branch: String,
    repository_root: String,
    last_commit_sha: String,
    last_commit_message: String,
    last_commit_at: String,
    has_uncommitted_changes: bool,
    changed_file_count: usize,
    tags: Vec<String>,
    recent_commits: Vec<GitCommitInfo>,
}

const RECENT_COMMIT_LIMIT: usize = 8;

/// Reads local git metadata for a project's git_repository_path. `path` is
/// only ever a directory the PI explicitly chose via a native folder picker
/// (see repositories' project update flow) — this command never searches
/// for or guesses a repository location. Uses the `git2` library directly
/// (no shell), so there is no command-injection surface and no dependency
/// on a `git` binary being on PATH.
#[tauri::command]
fn get_git_info(path: String) -> Result<GitInfo, String> {
    let repo = git2::Repository::discover(&path).map_err(|e| format!("Not a git repository: {e}"))?;

    let repository_root = repo
        .workdir()
        .unwrap_or_else(|| repo.path())
        .to_string_lossy()
        .to_string();

    let head = repo.head().map_err(|e| format!("Could not read HEAD: {e}"))?;
    let branch = head.shorthand().unwrap_or("(detached)").to_string();

    let commit = head.peel_to_commit().map_err(|e| format!("Could not read last commit: {e}"))?;
    let last_commit_sha = commit.id().to_string();
    let last_commit_message = commit.summary().unwrap_or("").to_string();
    let last_commit_at = chrono_from_git_time(commit.time());

    let statuses = repo
        .statuses(None)
        .map_err(|e| format!("Could not read working tree status: {e}"))?;
    let changed_file_count = statuses.len();
    let has_uncommitted_changes = changed_file_count > 0;

    let mut tags = Vec::new();
    repo.tag_foreach(|_oid, name| {
        if let Ok(name) = std::str::from_utf8(name) {
            tags.push(name.trim_start_matches("refs/tags/").to_string());
        }
        true
    })
    .map_err(|e| format!("Could not read tags: {e}"))?;

    let mut recent_commits = Vec::new();
    let mut revwalk = repo.revwalk().map_err(|e| format!("Could not walk history: {e}"))?;
    revwalk.push_head().map_err(|e| format!("Could not walk history: {e}"))?;
    for oid in revwalk.take(RECENT_COMMIT_LIMIT) {
        let oid = oid.map_err(|e| format!("Could not read commit: {e}"))?;
        let c = repo.find_commit(oid).map_err(|e| format!("Could not read commit: {e}"))?;
        recent_commits.push(GitCommitInfo {
            sha: c.id().to_string(),
            message: c.summary().unwrap_or("").to_string(),
            committed_at: chrono_from_git_time(c.time()),
        });
    }

    Ok(GitInfo {
        branch,
        repository_root,
        last_commit_sha,
        last_commit_message,
        last_commit_at,
        has_uncommitted_changes,
        changed_file_count,
        tags,
        recent_commits,
    })
}

/// Formats a git2::Time as an ISO-8601 UTC string without pulling in the
/// `chrono` crate just for this — git2::Time is already (unix seconds, tz
/// offset minutes), and every other timestamp in this app is UTC ISO-8601.
fn chrono_from_git_time(time: git2::Time) -> String {
    let secs = time.seconds();
    let days_since_epoch = secs.div_euclid(86400);
    let secs_of_day = secs.rem_euclid(86400);

    // Civil-from-days algorithm (Howard Hinnant's public-domain date algorithms).
    let z = days_since_epoch + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    let h = secs_of_day / 3600;
    let min = (secs_of_day % 3600) / 60;
    let s = secs_of_day % 60;

    format!("{y:04}-{m:02}-{d:02}T{h:02}:{min:02}:{s:02}Z")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Optional, manual-only update check (SPEC_followup section 30 /
        // SPEC_followup_2's Tier 3 note): never checks automatically on
        // launch, so it cannot affect the app's offline-first guarantee.
        // The frontend calls check()/downloadAndInstall() only when the PI
        // explicitly clicks "Check for Updates" in Settings.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin({
            let sql = tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pi-research-os.db", migrations());
            // `tauri dev` and a release build share a bundle identifier, so
            // they'd otherwise collide on the same app-data SQLite file (see
            // packages/repositories/src/db/client.ts) — the frontend picks a
            // separate filename in dev, which needs its own migrations here.
            #[cfg(debug_assertions)]
            let sql = sql.add_migrations("sqlite:pi-research-os.dev.db", migrations());
            sql.build()
        })
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![get_git_info])
        .run(tauri::generate_context!())
        .expect("error while running PI Research OS");
}
