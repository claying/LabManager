# Research OS

A fully offline, single-user, desktop-first research lab management system for one Principal
Investigator — projects, people, milestones, weekly updates, meetings (with searchable
decisions), publications, and grants.

```text
People <-> Projects <-> Outputs
```

## 1. Architecture summary

Local-first monorepo (pnpm workspaces + Turborepo). There is **no cloud backend, no server
process, no multi-user auth, and no required internet connection.** The Tauri desktop app is the
canonical product; SQLite (via the official `tauri-plugin-sql`) is the single authoritative
database, stored in the OS's app-data directory.

```text
Tauri 2 Desktop -> React/TypeScript -> Domain Layer -> Repository Layer -> SQLite
                                                                        -> Local Search (FTS5)
                                                                        -> Local Files
                                                                        -> Backups (.zip)
```

```text
apps/
  desktop/       Tauri 2 + Vite + React — the primary, canonical client
    src/routes/          React Router pages
    src/components/      Dialogs, forms, and page-specific UI
    src/lib/native/      Tauri capability adapters (notifications, external links, ...)
    src-tauri/           Rust shell: plugin registration, migrations, git-info command
      migrations/        Numbered SQL migrations (001_initial.sql, 002_add_search.sql, ...)
      capabilities/       Narrowly-scoped Tauri permission grants

packages/
  ui/            Design system — shadcn/ui-style primitives + domain components
                 (StatusBadge, DataTable, PipelineBoard, AttentionCard, EmptyState, ...)
  domain/        Pure business logic — attention/health signals, date math, Zod validation
                 schemas. No React, no I/O of any kind.
  repositories/  The ONLY place that talks to SQLite. Repository objects (projectRepository,
                 meetingRepository, ...) wrap all SQL; TanStack Query hooks wrap the
                 repositories; a demo-data seeder; backup/export/search/file-picker helpers.
  types/         Hand-authored entity + enum types shared by every package.
  config/        Shared ESLint flat configs + Tailwind preset (design tokens).
```

**Why a repository layer:** no page or dialog ever writes raw SQL. Everything goes through a
typed repository interface (`ProjectRepository`, `PeopleRepository`, etc.) in
`packages/repositories`, so persistence details (SQLite, migrations, FTS5 indexing triggers) stay
fully decoupled from the UI.

### Data flow

```text
Component (Desktop)
  -> hook from @pi-os/repositories (TanStack Query)
    -> repository function (typed SQL against the local SQLite connection)
      -> SQLite (tauri-plugin-sql, single connection, single workspace)
  <- domain calculations from @pi-os/domain (attention, pipeline, upcoming, people load)
```

Attention signals, pipeline counts, upcoming deadlines, and people-load are pure functions in
`packages/domain` — no cron job, no server-side computation, nothing that requires the app to be
"online."

## 2. Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 9+ (`corepack enable` or `npm i -g pnpm`)
- [Rust](https://www.rust-lang.org/tools/install) (stable) + [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

That's it — no Docker, no database server, no cloud account, no API keys.

## 3. Setup

```bash
pnpm install
pnpm dev:desktop
```

`pnpm dev:desktop` launches the full native app (Rust shell + Vite dev server) with hot reload.
On first launch you'll see onboarding — enter your name, institution, and lab name to create your
local workspace, or choose **Load Demo Workspace** for a fully populated sample lab (8 projects
across every pipeline stage, 8 people, meetings with recorded decisions, publications, grants, and
one deliberately stalled project so "Need Attention" has something to show immediately).

No account creation, no email, no password.

## 4. Where data lives

SQLite database, local file references, and backups all live under the OS's standard app-data
directory for the app (identifier `com.piresearchos.app`) — never inside the source tree:

- **macOS:** `~/Library/Application Support/com.piresearchos.app/`
- **Windows:** `%APPDATA%\com.piresearchos.app\`
- **Linux:** `~/.local/share/com.piresearchos.app/`

The database file itself is `pi-research-os.db`. Settings → Data shows the exact path and size.

## 5. Database schema & migrations

15 tables, UUID-keyed: `workspace` (singleton), `people`, `projects`, `project_members`,
`project_updates`, `milestones`, `meetings`, `meeting_attendees`, `action_items`, `publications`,
`publication_authors`, `grants`, `grant_members`, `attachments`, `settings`.

Migrations live in `apps/desktop/src-tauri/migrations/*.sql` and are registered with
`tauri-plugin-sql`, which tracks applied versions and safely forward-migrates on every launch —
never destroying data:

- `001_initial.sql` — all core tables, CHECK constraints for every enum, triggers that
  auto-bump `updated_at` and a project's `last_update_at`.
- `002_add_search.sql` — an FTS5 virtual table (`search_index`) plus insert/update/delete
  triggers that keep it in sync for projects, people, project updates, meetings (including the
  `decisions` field specifically), publications, and grants.
- `003_add_attachments.sql` — the `attachments` table for local file/folder references.

## 6. Local search

Cmd+K (macOS) / Ctrl+K (Windows/Linux) opens a command palette backed by SQLite FTS5 —
`packages/repositories/src/repositories/searchRepository.ts`. It's plain keyword search (porter
stemming, `bm25()` ranking), not semantic — the point is that a decision recorded in a meeting six
months ago is still one search away, entirely offline.

## 7. Backup, export, and import

Settings → Data. Since there's no cloud backend, backups are first-class:

- **Backup Now** — `VACUUM INTO` a clean snapshot of the live database, zip it with a
  `manifest.json` (format version, app version, schema version, workspace name) into
  `research-os-backup-YYYY-MM-DD.zip` in your chosen backup directory (a local folder, or a
  folder synced by iCloud Drive / OneDrive / Dropbox / a NAS — the app just writes files there,
  it doesn't integrate with those services).
- **Automatic backups** run once per day the app is used, with configurable retention (default
  14 daily backups).
- **Restore Backup** validates the zip first (format version, required files), backs up your
  _current_ workspace before touching anything, then replaces the database file — so a bad
  restore is always recoverable.
- **Export** — Projects / People / Publications / Grants as JSON or CSV, Meetings as Markdown or
  JSON, or the entire workspace as one JSON file.

## 8. Local file references & git status

Projects, meetings, publications, and grants can each link local files or folders (a project
folder, a PDF, a results spreadsheet) via native OS pickers — the app never scans the filesystem
on its own, only paths the user explicitly chose. Linked items support Open and Reveal in
Finder/Explorer.

If a project has a linked git repository, its overview tab shows the current branch, last commit,
and whether there are uncommitted changes — read locally via the `git2` Rust crate (no shelling
out, no GitHub required).

## 9. Running it

```bash
pnpm dev:desktop      # Tauri dev window (spawns the Vite dev server itself)
```

### Tests

```bash
pnpm test             # unit tests (vitest) across all packages
```

Notable coverage: `packages/repositories/src/db/migrations.test.ts` runs every migration file
against a real in-process SQLite engine (Node's built-in `node:sqlite`) and asserts table
creation, foreign-key enforcement, cascade deletes, trigger behavior, and FTS5 indexing/search —
including that meeting decisions are indexed and searchable.
`packages/repositories/src/repositories/backupRepository.test.ts` covers backup validation,
including corrupted and incompatible-format zips.
`apps/desktop/src/offline.test.ts` statically scans the app and the repository layer for network
primitives (`fetch`, `XMLHttpRequest`, `WebSocket`, `axios`, any Supabase client) and fails if it
finds any — a standing guarantee that the core app cannot make a network call.

### Build

```bash
pnpm build:desktop    # Tauri release bundle (.app/.dmg, .msi, .AppImage/.deb depending on OS)
```

## 10. Known limitations

- **Windows and Linux bundles were not built in this environment** (macOS-only sandbox) — the
  Tauri config targets `"all"` and nothing in the Rust code is platform-specific beyond what
  `tauri-plugin-window-state`/`git2` already handle cross-platform, but only the macOS build was
  actually verified here.
- **No code-signing/updater credentials are configured.** Tauri's optional updater can be added
  later without touching offline behavior (the spec requires it not depend on internet); shipping
  signed releases needs a signing identity and update-server config as a separate release-time
  step.
- **Git status is intentionally lightweight** — branch, last commit, uncommitted-changes flag
  only. No history browsing, diffing, or write operations.
- **`apps/desktop/src/lib/native/future-adapters.ts`** defines interfaces for integrations that
  are deliberately out of scope for now (opening a linked folder in VS Code/terminal, listing
  experiment run folders, a local LLM assistant) so a future Tauri command can fill them in
  without touching UI code.

## 11. Recommended next priorities

1. Wire up Tauri's optional updater (behind a capability that's a no-op when offline).
2. Build and smoke-test the Windows and Linux bundles.
3. Fill in one `future-adapters.ts` capability — "open in VS Code" from a linked project folder
   is the highest-value one.
4. CSV/JSON _import_ beyond the app's own backup format (the exporter's structure was kept
   simple specifically so this can expand later).
