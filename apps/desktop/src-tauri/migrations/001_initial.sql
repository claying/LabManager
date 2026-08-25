-- ============================================================================
-- PI Research OS — initial local schema (SQLite)
--
-- Single-workspace, single-user. No auth, no row-level security, no tenant
-- scoping: the whole database belongs to the one PI running the app, so
-- there is nothing to isolate. IDs are UUIDs generated in the TypeScript
-- repository layer (SQLite has no native UUID function); timestamps are
-- ISO-8601 UTC strings, matching the shape the UI already expects.
--
-- Applied automatically on startup by tauri-plugin-sql's migration runner
-- (see src-tauri/src/lib.rs) — never edit an already-released migration;
-- add a new numbered file instead.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- people — anyone the PI tracks. Role/status are free text with a CHECK
-- rather than a native SQLite enum (SQLite has none); packages/types mirrors
-- the same literal union so the app-level contract stays exactly as strict.
-- research_interests/skills are JSON arrays stored as text, parsed at the
-- repository boundary so the TS-facing shape is still string[].
--
-- Created before `workspace` since workspace.pi_person_id references it.
-- ---------------------------------------------------------------------------
create table people (
  id text primary key,
  name text not null,
  email text,
  avatar_url text,
  role text not null default 'PhD'
    check (role in ('PI','Postdoc','PhD','Master','RA','Research Assistant','Intern','Collaborator','Alumni','Other')),
  status text not null default 'active' check (status in ('active','inactive','alumni')),
  start_date text,
  end_date text,
  expected_graduation text,
  research_interests text not null default '[]',
  skills text not null default '[]',
  bio text,
  website_url text,
  github_url text,
  google_scholar_url text,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_people_status on people(status);

-- ---------------------------------------------------------------------------
-- workspace — singleton root. Exactly one row ever exists; its presence is
-- what the app checks on launch to decide "first run" vs "open workspace".
-- ---------------------------------------------------------------------------
create table workspace (
  id text primary key,
  name text not null,
  institution text,
  pi_name text not null,
  pi_person_id text references people(id) on delete set null,
  description text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id text primary key,
  title text not null,
  short_name text,
  description text,
  lead_person_id text references people(id) on delete set null,
  stage text not null default 'idea' check (stage in
    ('idea','prototype','baselines','main_experiments','ablation','writing','submitted','rebuttal','accepted','published','paused')),
  health text not null default 'healthy' check (health in ('healthy','attention','at_risk','stalled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  start_date text,
  target_date text,
  next_milestone text,
  next_milestone_date text,
  last_update_at text,
  github_url text,
  overleaf_url text,
  drive_url text,
  website_url text,
  research_folder_path text,
  git_repository_path text,
  paper_folder_path text,
  results_folder_path text,
  archived integer not null default 0 check (archived in (0, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_projects_stage on projects(stage);
create index idx_projects_archived on projects(archived);
create index idx_projects_lead on projects(lead_person_id);

create trigger trg_projects_updated_at after update on projects
when new.updated_at = old.updated_at
begin
  update projects set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
create table project_members (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  role text not null default 'core_member' check (role in ('lead','core_member','collaborator','advisor')),
  joined_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  left_at text
);

create index idx_project_members_project on project_members(project_id);
create index idx_project_members_person on project_members(person_id);

-- ---------------------------------------------------------------------------
-- project_updates — the weekly-update journal
-- ---------------------------------------------------------------------------
create table project_updates (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  author_person_id text references people(id) on delete set null,
  summary text not null,
  progress text,
  blockers text,
  next_steps text,
  health text check (health in ('healthy','attention','at_risk','stalled')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_project_updates_project on project_updates(project_id, created_at desc);

-- Mirrors the previous Postgres trigger: posting an update always bumps the
-- parent project's last_update_at, regardless of which UI/repository path
-- performed the insert (including future import/restore code paths).
create trigger trg_project_updates_bump_project after insert on project_updates
begin
  update projects set last_update_at = new.created_at where id = new.project_id;
end;

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table milestones (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  due_date text,
  completed_at text,
  owner_person_id text references people(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_milestones_project on milestones(project_id);
create index idx_milestones_due on milestones(due_date);

create trigger trg_milestones_updated_at after update on milestones
when new.updated_at = old.updated_at
begin
  update milestones set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------
create table meetings (
  id text primary key,
  project_id text references projects(id) on delete set null,
  title text not null,
  meeting_type text not null default 'project' check (meeting_type in ('project','one_on_one','lab','collaboration','other')),
  meeting_date text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  summary text,
  progress text,
  results text,
  blockers text,
  decisions text,
  next_steps text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_meetings_project on meetings(project_id);
create index idx_meetings_date on meetings(meeting_date desc);

create trigger trg_meetings_updated_at after update on meetings
when new.updated_at = old.updated_at
begin
  update meetings set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create table meeting_attendees (
  id text primary key,
  meeting_id text not null references meetings(id) on delete cascade,
  person_id text not null references people(id) on delete cascade
);

create index idx_meeting_attendees_meeting on meeting_attendees(meeting_id);
create index idx_meeting_attendees_person on meeting_attendees(person_id);

-- ---------------------------------------------------------------------------
-- action_items
-- ---------------------------------------------------------------------------
create table action_items (
  id text primary key,
  project_id text references projects(id) on delete set null,
  meeting_id text references meetings(id) on delete set null,
  assignee_person_id text references people(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date text,
  completed_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_action_items_project on action_items(project_id);
create index idx_action_items_status on action_items(status);

create trigger trg_action_items_updated_at after update on action_items
when new.updated_at = old.updated_at
begin
  update action_items set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- publications
-- ---------------------------------------------------------------------------
create table publications (
  id text primary key,
  project_id text references projects(id) on delete set null,
  title text not null,
  status text not null default 'idea' check (status in
    ('idea','experiments','drafting','internal_review','submitted','rebuttal','accepted','published','withdrawn')),
  venue text,
  submission_deadline text,
  submission_date text,
  acceptance_date text,
  publication_date text,
  doi text,
  arxiv_url text,
  overleaf_url text,
  code_url text,
  paper_url text,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_publications_project on publications(project_id);
create index idx_publications_deadline on publications(submission_deadline);

create trigger trg_publications_updated_at after update on publications
when new.updated_at = old.updated_at
begin
  update publications set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create table publication_authors (
  id text primary key,
  publication_id text not null references publications(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  author_order integer not null default 1,
  is_corresponding integer not null default 0 check (is_corresponding in (0, 1)),
  is_equal_contribution integer not null default 0 check (is_equal_contribution in (0, 1))
);

create index idx_publication_authors_pub on publication_authors(publication_id);
create index idx_publication_authors_person on publication_authors(person_id);

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
create table grants (
  id text primary key,
  title text not null,
  funder text,
  program text,
  status text not null default 'idea' check (status in ('idea','preparing','submitted','awarded','rejected','active','completed')),
  deadline text,
  start_date text,
  end_date text,
  amount real,
  currency text not null default 'USD',
  pi_person_id text references people(id) on delete set null,
  description text,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_grants_deadline on grants(deadline);
create index idx_grants_status on grants(status);

create trigger trg_grants_updated_at after update on grants
when new.updated_at = old.updated_at
begin
  update grants set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create table grant_members (
  id text primary key,
  grant_id text not null references grants(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  role text not null default 'contributor' check (role in ('pi','co_pi','senior_personnel','contributor'))
);

create index idx_grant_members_grant on grant_members(grant_id);
create index idx_grant_members_person on grant_members(person_id);

-- ---------------------------------------------------------------------------
-- settings — small extensible key/value store (theme, backup prefs, ...)
-- ---------------------------------------------------------------------------
create table settings (
  key text primary key,
  value text not null
);
