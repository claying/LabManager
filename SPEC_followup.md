# Refactor PI Research OS to Fully Offline, Desktop-First Architecture

The product requirements have changed significantly.

Read the existing repository and the previous specification before making changes.

**Do not restart the project from scratch.** Preserve and reuse as much of the existing implementation as is sensible, especially:

- React components
- shadcn/ui components
- design system
- TypeScript domain models
- Zod schemas
- project/people/publication/meeting/grant UI
- dashboard
- business logic
- tests that remain applicable

However, the previous cloud/multi-user architecture is no longer the target.

The new product is:

> **A fully offline, single-user, desktop-first Research OS for one Principal Investigator.**

The PI is the only application user.

All research-management data must remain on the PI's computer.

The application must work completely without Internet access.

---

# 1. Architectural change

The old architecture was approximately:

```text
Web/Desktop
     ↓
Supabase
     ↓
PostgreSQL/Auth/Storage
```

Replace this with:

```text
                 Tauri 2 Desktop
                        │
               React + TypeScript
                        │
                  Domain Layer
                        │
                 Repository Layer
                        │
                     SQLite
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   Local Search    Local Files       Backups
```

The Tauri desktop application is now the **canonical product**.

SQLite is the **authoritative database**.

There is:

- no cloud database
- no cloud synchronization
- no remote backend
- no multi-user collaboration
- no Supabase dependency
- no required Internet connection

---

# 2. First inspect the existing implementation

Before changing code:

1. inspect the entire repository
2. determine which parts of the original specification have already been implemented
3. identify reusable UI/domain/business logic
4. identify code tightly coupled to Supabase
5. identify code tightly coupled to Next.js
6. identify existing database schema/migrations
7. identify tests that can be preserved
8. identify unfinished work

Then create a concise migration/refactoring plan.

Do not delete working code unnecessarily.

Prefer adapting existing code over rewriting it.

---

# 3. Remove Supabase

Remove Supabase as a runtime dependency.

Remove or refactor:

- Supabase Auth
- Supabase database access
- Supabase Storage
- Supabase Realtime
- Supabase RLS
- Supabase Edge Functions
- Supabase environment variables
- cloud session handling
- cloud tenant isolation

Remove unused Supabase packages after migration.

Do not leave dead Supabase code behind "for later."

The application must run without Supabase credentials.

---

# 4. Remove multi-user and multi-tenant complexity

The PI is the only application user.

Remove unnecessary concepts such as:

```text
auth users
lab memberships
owner/admin/member/guest roles
RLS
invitations
tenant isolation
cloud permissions
```

Do NOT create a fake authentication system to replace Supabase Auth.

The desktop app should simply open into the PI's workspace.

Optional app locking can be added later and is not required for this migration.

---

# 5. Keep a Workspace concept

Although there is only one user, retain a simple workspace entity.

Example:

```text
workspace

id
name
institution
pi_name
description
created_at
updated_at
```

This provides a clean root object for:

- settings
- backup/export
- future migration
- possible multiple workspaces later

Do not overengineer multi-workspace support now.

---

# 6. SQLite becomes the authoritative database

Use local SQLite.

Prefer an established Tauri 2-compatible SQLite approach.

Use the official Tauri SQL plugin if it fits the existing architecture cleanly.

The SQLite database should be stored in the application's appropriate OS-specific application data directory.

Do NOT store the production database inside the source tree.

Do NOT require Docker or an external database process.

---

# 7. Preserve the relational domain model

Retain/refactor the useful entities from the previous specification:

```text
workspace

people

projects
project_members
project_updates
milestones

meetings
meeting_attendees
action_items

publications
publication_authors

grants
grant_members

attachments

settings
```

Use proper foreign keys and indexes.

Use UUIDs for entity IDs unless there is a strong reason not to.

Keep:

```text
created_at
updated_at
```

where appropriate.

Remove cloud-only fields such as:

```text
created_by auth user
lab tenant IDs where unnecessary
sync_status
server version
RLS-related metadata
```

There is no synchronization system.

---

# 8. Database migrations are mandatory

Implement local SQLite migrations.

Example:

```text
migrations/

001_initial.sql
002_add_search.sql
003_add_attachments.sql
```

The desktop application must automatically detect and apply required migrations safely when upgraded.

Never destroy user data during an application update.

Before risky migrations, integrate with the backup mechanism where practical.

Migration behavior must be tested.

---

# 9. Repository abstraction

This is important.

Do not allow React components to execute raw SQLite queries everywhere.

Create or preserve a clean repository/data-access abstraction.

Example:

```text
ProjectRepository
PeopleRepository
MeetingRepository
PublicationRepository
GrantRepository
```

Conceptually:

```text
React UI
    ↓
Domain/services
    ↓
Repository interfaces
    ↓
SQLite implementation
```

Example interface:

```ts
interface ProjectRepository {
  get(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  remove(id: string): Promise<void>;
}
```

Keep business logic separate from persistence logic.

Reuse existing Zod schemas and TypeScript types where appropriate.

---

# 10. Desktop becomes the primary application

Prioritize:

```text
apps/desktop
```

using:

- Tauri 2
- Vite
- React
- TypeScript
- Tailwind
- shadcn/ui

The desktop application should contain the complete product.

It must not depend on a Next.js server running in the background.

Running:

```text
pnpm dev:desktop
```

must launch a fully functional local application.

A packaged application must work without Node.js, pnpm, Supabase, or any server installed on the user's machine.

---

# 11. Treatment of the existing Web application

Do not spend significant effort preserving full Web/Desktop parity.

The desktop application is canonical.

If the existing Next.js application contains useful components, extract/share them cleanly.

If keeping a browser version is inexpensive, it may remain as:

- a UI development environment
- a demo
- a future PWA foundation

But it must NOT drive architectural decisions.

Do not implement a second offline database/synchronization system for the Web version now.

Do not implement IndexedDB synchronization.

If maintaining the Web application meaningfully complicates the offline architecture, prioritize Desktop and document the limitation.

---

# 12. Preserve the existing product functionality

The desktop application should continue supporting the useful features from the original specification:

## Dashboard

- active projects
- active researchers
- upcoming deadlines
- projects needing attention
- research pipeline
- recent updates
- people workload

## Projects

- table
- pipeline board
- research stages
- health
- priority
- milestones
- weekly updates
- members
- related publications
- related meetings

## People

- profiles
- role
- research interests
- skills
- active projects
- publications
- meetings
- milestones
- action items

## Meetings

- progress
- findings
- blockers
- decisions
- next actions

## Publications

- pipeline
- authors
- project association
- venue
- deadlines
- status

## Grants

- pipeline
- deadlines
- members
- status

Do not regress these features merely because persistence changes.

---

# 13. Weekly updates remain a core workflow

The primary workflow remains:

```text
Dashboard
    ↓
Project
    ↓
Add Weekly Update
```

The update should contain:

```text
Progress
Key results/findings
Blockers
Next steps
Project health
```

On save:

- write immediately to SQLite
- update project `last_update_at`
- update project health if requested
- update UI immediately

There must be no network request.

---

# 14. Project attention logic remains local

Preserve or implement the deterministic attention logic in shared domain code.

Signals:

```text
NO_UPDATE_14_DAYS
NO_UPDATE_30_DAYS
MILESTONE_DUE_SOON
MILESTONE_OVERDUE
PUBLICATION_DEADLINE_SOON
GRANT_DEADLINE_SOON
```

Example:

```text
Protein Generation

Needs attention:
• No update for 18 days
• Milestone overdue by 3 days
```

All calculations must work locally.

Do not require cron jobs or server-side jobs.

Recalculate when the application starts and when relevant data changes.

---

# 15. Local full-text search

Implement strong offline search.

Use SQLite FTS5 if available and appropriate.

Global search should cover at minimum:

```text
projects
people
project updates
meeting notes
meeting decisions
publications
grants
```

Use:

```text
Cmd+K
```

on macOS and:

```text
Ctrl+K
```

on Windows/Linux.

Search must be fast and entirely offline.

Results should indicate entity type.

Example:

```text
PROJECT
Geometric Flow Matching

MEETING
Aug 18 — Decision to use recurrent metric

PERSON
Alice Zhang

PUBLICATION
Equivariant Coordinate Updates
```

---

# 16. Research decisions should be first-class searchable information

Meeting `decisions` are especially important.

Make decisions visually prominent on meeting pages.

Ensure decision text is included in FTS.

The PI should be able to search months later for terms such as:

```text
"recurrent metric"
"dataset split"
"why did we stop using diffusion"
```

and find relevant historical meetings/updates.

Do not implement semantic/AI search yet.

Keyword full-text search is sufficient for now.

---

# 17. Local file integration

Add a lightweight local attachment/reference system.

Allow projects, meetings, publications, and grants to reference local files or directories.

Examples:

```text
Project folder
Git repository
Paper PDF
Results spreadsheet
Notes
Presentation
```

Use Tauri's permission-safe filesystem capabilities.

Never silently scan the entire user's filesystem.

Only access files/folders explicitly selected by the user or authorized through appropriate Tauri capabilities.

Support actions such as:

```text
Open File
Reveal in Finder / Explorer
Open Folder
```

where supported.

---

# 18. Project local paths

Projects may optionally contain local paths such as:

```text
research_folder
git_repository
paper_folder
results_folder
```

These are optional.

The app should still work perfectly without them.

Use native folder pickers rather than asking the user to type paths manually where practical.

---

# 19. Git metadata — lightweight only

If reasonably straightforward, support basic local Git repository information when a project has an explicitly selected Git repository.

Display:

```text
Current branch
Last commit
Last commit time
Uncommitted changes
```

This must work using the local repository and must not require GitHub.

Do not build full Git integration.

Do not delay the core offline migration if this feature becomes complex.

Treat it as lower priority than database, backup, search, and export.

---

# 20. Backup is a first-class feature

Because there is no cloud backend, robust backups are mandatory.

Implement:

```text
Automatic Backup
Manual Backup
Restore Backup
Export Workspace
Import Workspace
```

Backups should include:

```text
SQLite database
managed attachments, if any
manifest/version metadata
```

If the app stores only references to external files, do not duplicate those external files unless explicitly designed as managed attachments.

Clearly distinguish:

```text
Managed attachments
External file references
```

---

# 21. Automatic backups

Default behavior:

- create an automatic backup daily when the application is used
- avoid creating duplicate backups unnecessarily
- keep a configurable number of recent backups
- default retention: 14 daily backups

Also create a backup before potentially destructive database migrations where practical.

Allow the user to select a custom backup directory.

This enables users to choose folders such as:

```text
iCloud Drive
OneDrive
Dropbox
institutional backup folder
NAS-mounted directory
```

The app itself must not integrate with or depend on those cloud services.

It simply writes backup files to the chosen directory.

---

# 22. Backup format

Use a versioned portable backup format.

For example:

```text
research-os-backup-2026-08-24.zip

manifest.json
database.sqlite
attachments/
```

`manifest.json` should include:

```text
backup_format_version
app_version
created_at
workspace_name
database_schema_version
```

Restore must validate the backup before replacing existing data.

Before restoring, automatically back up the current workspace.

Never overwrite the current database without a recovery path.

---

# 23. Export data

In addition to binary backup, support human-readable export.

At minimum:

```text
Export Projects → JSON/CSV
Export People → JSON/CSV
Export Publications → JSON/CSV
Export Meetings → Markdown/JSON
Export entire workspace → JSON
```

The user should never feel locked into the application.

Prefer stable, documented export structures.

---

# 24. Import

Support restoring the application's own backup format.

Also structure the importer so CSV/JSON import can be expanded later.

Do not implement complex Notion/Airtable importers now.

---

# 25. Settings page

Add/refactor a local Settings page.

Sections:

## Workspace

```text
Workspace name
PI name
Institution
```

## Data

```text
Database location
Database size
Last backup
Backup now
Backup directory
Backup retention
Export workspace
Restore backup
```

## Appearance

```text
Light
Dark
System
```

## Application

```text
Version
Check for updates
```

No cloud account settings are necessary.

---

# 26. Native notifications

Keep desktop notifications if already implemented.

Notifications can be generated locally for:

```text
milestones due soon
overdue milestones
publication deadlines
grant deadlines
```

Do not require a server.

Avoid excessive notifications.

Default to conservative notification behavior.

---

# 27. Application startup

Startup should roughly perform:

```text
Launch
 ↓
Locate/create app data directory
 ↓
Open SQLite
 ↓
Run migrations
 ↓
Check backup schedule
 ↓
Load workspace
 ↓
Calculate attention signals
 ↓
Render dashboard
```

This should feel fast.

---

# 28. First launch

If there is no workspace/database yet, show simple onboarding:

```text
Welcome to Research OS

Your Name
Institution
Lab / Workspace Name

[Create Workspace]
```

Then optionally offer:

```text
Start Empty

or

Load Demo Workspace
```

No account creation.

No email.

No password.

No Internet connection.

---

# 29. Demo data

Preserve/create the realistic demo dataset from the previous specification.

Provide a developer-accessible way to create/reset demo data.

Do not mix demo data into a real workspace accidentally.

---

# 30. Privacy

The application should be able to truthfully state:

> Research management data is stored locally on this computer and the core application does not require a cloud account.

Do not add analytics, telemetry, crash reporting, or remote tracking by default during this migration.

If any network-dependent updater exists, make that behavior clearly separable from core functionality.

The core product must remain functional when the machine has no network.

---

# 31. Network isolation test

Add a practical test/check demonstrating that core functionality works without network connectivity.

The following must work offline:

```text
launch application
view dashboard
view people
view projects
create project
edit project
add weekly update
create meeting
record decisions
create publication
create grant
search
backup
export
```

No operation in this list may wait for a remote timeout.

---

# 32. Tauri security

Follow Tauri 2 security best practices.

Use narrowly scoped capabilities.

Do not grant blanket filesystem access.

Do not expose arbitrary shell execution to the frontend.

Validate arguments crossing the React ↔ Tauri boundary.

Only permit native functionality required by the application.

---

# 33. Desktop packaging

Ensure the application builds for:

```text
macOS
Windows
Linux
```

Prioritize macOS development quality if platform-specific tradeoffs arise, but do not intentionally break Windows/Linux.

Keep platform-specific code isolated.

---

# 34. Automatic updater

The core app must not depend on Internet access.

However, it is acceptable to retain/add Tauri's optional updater so that, when Internet is available, the PI can check for a new application version.

The updater must not affect offline operation.

If signing/updater credentials are unavailable, configure the architecture and document the remaining release-time steps rather than blocking development.

---

# 35. Preserve shared UI architecture where useful

A reasonable resulting repository may look like:

```text
apps/
  desktop/
  web/               # optional/non-canonical

packages/
  ui/
  domain/
  repositories/
  types/
  config/

apps/desktop/src-tauri/
  migrations/
  capabilities/
  native/

docs/
```

Adapt this based on the existing repository rather than mechanically recreating it.

---

# 36. Do not introduce unnecessary infrastructure

Do NOT add:

```text
Supabase
Firebase
remote PostgreSQL
Redis
Docker requirement
Kubernetes
remote REST backend
GraphQL server
cloud authentication
sync server
CRDT synchronization
```

There is one user and one authoritative local database.

Keep the architecture correspondingly simple.

---

# 37. Important scope exclusions

Do NOT implement yet:

- multi-user collaboration
- cloud sync
- Web/Desktop synchronization
- mobile apps
- full Notion block editor
- real-time collaborative editing
- semantic vector search
- AI assistant
- local LLM
- GitHub API integration
- Overleaf API integration
- automatic filesystem-wide indexing
- complex experiment tracking
- LIMS/inventory

Focus on making the offline desktop product excellent.

---

# 38. Testing changes

Preserve relevant existing tests.

Remove/rewrite tests that exist solely for:

```text
Supabase Auth
RLS
multi-tenancy
cloud APIs
```

Add tests for:

## Database

- migrations
- foreign keys
- CRUD
- backup/restore

## Domain

- project attention logic
- deadlines
- validation

## Search

- indexing
- updates to FTS
- meeting decision retrieval

## Backup

- create
- validate
- restore
- incompatible/corrupted backup handling

## E2E

At minimum:

```text
first launch
create workspace
create person
create project
assign person
add weekly update
create meeting
record decision
search for decision
create publication
create grant
backup workspace
restart app
verify persistence
```

Where practical, run core E2E tests without network access.

---

# 39. Data durability requirements

Treat user data as more important than convenience.

Use:

- SQLite transactions
- foreign keys
- safe migrations
- atomic backup/restore operations where practical
- validation before destructive operations

Never silently discard user data.

If an operation fails, preserve the previous valid state and show a useful error.

---

# 40. Developer experience

Update:

```text
README.md
```

Remove obsolete Supabase setup instructions.

Desktop development should ideally be:

```text
pnpm install
pnpm dev:desktop
```

Document Tauri/Rust system prerequisites.

Production build:

```text
pnpm build:desktop
```

Tests:

```text
pnpm test
pnpm test:e2e
```

No database server should need to be launched manually.

---

# 41. Migration of existing development/demo data

If the current repository contains only seed/demo Supabase data, migrate the seed logic to SQLite.

If there is no real user production data, do not waste effort building a Supabase-to-SQLite production migration utility.

If real user data is detected or clearly represented in the repository, preserve it and provide a safe migration path.

Do not assume production data exists.

---

# 42. Product priority order

Implement this refactor approximately in this order:

```text
1. Inspect current implementation
2. Preserve/extract reusable UI/domain code
3. Introduce SQLite
4. Implement migrations
5. Implement repository layer
6. Replace Supabase persistence
7. Remove Auth/multi-user/RLS
8. Make Desktop fully functional
9. Verify all existing core features
10. Implement local FTS search
11. Implement backup/restore
12. Implement export/import
13. Implement local file references
14. Implement settings/data management
15. Implement offline-native notifications
16. Optional lightweight Git metadata
17. Remove dead cloud code/dependencies
18. Update tests
19. Verify offline behavior
20. Update documentation
```

After each major phase run:

```text
typecheck
lint
tests
desktop build
```

Keep the repository runnable throughout the migration.

---

# 43. Definition of Done

This migration is complete when I can disconnect the computer from the Internet, launch the packaged application, and:

1. open my workspace
2. view the PI dashboard
3. create/edit people
4. create/edit projects
5. assign people to projects
6. move projects through research stages
7. add weekly updates
8. see stalled/overdue project warnings
9. create milestones
10. record meetings
11. record and search historical decisions
12. manage publications
13. manage grants
14. use global search
15. attach/reference local research files
16. close and reopen the app without losing data
17. create a backup
18. restore a backup safely
19. export my data
20. upgrade database schema through migrations without data loss

None of these operations may require:

```text
Internet
Supabase
cloud credentials
external database
local server process
```

---

# 44. Final architectural principle

When choosing between two implementations, prefer the one that reinforces:

```text
local-first
single-user
privacy
simplicity
data durability
fast startup
native desktop integration
low maintenance
```

Do not preserve cloud abstractions merely because they existed in the previous specification.

At the same time, do not rewrite good existing UI or domain code just to satisfy the new architecture.

The desired result is:

```text
PI Research OS

Tauri 2
+
React / TypeScript
+
SQLite
+
Local filesystem
+
FTS5 search
+
Robust backups
```

with **zero required cloud infrastructure**.

Proceed with the refactor end-to-end. Make reasonable implementation decisions independently rather than repeatedly asking for confirmation. At completion, summarize:

1. what was preserved
2. what was removed
3. the final architecture
4. SQLite schema/migration strategy
5. where application data is stored on each OS
6. backup/restore behavior
7. offline search implementation
8. commands to develop/test/build
9. remaining limitations
10. recommended next steps
