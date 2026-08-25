-- ============================================================================
-- Tier 3: Research memory, relationships, project relations, artifacts,
-- local file indexing, saved views, favorites, and project closeout.
--
-- Research Memory and the Relationship Graph are deliberately NOT backed by
-- their own tables here — per the Tier 3 spec they're derived at query time
-- from existing authoritative tables (decisions, meetings, updates,
-- evidence, milestones, project_stage_history, hypotheses, publications,
-- grants, ideas, and the FK relationships already on those rows). Only
-- genuinely new, manually-entered data gets a table below.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- project_relations — manually-created research relationships between two
-- projects (not derived; the PI decides these).
-- ---------------------------------------------------------------------------
create table project_relations (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  related_project_id text not null references projects(id) on delete cascade,
  relation_type text not null check (relation_type in ('depends_on', 'extends', 'shares_data_with', 'shares_method_with', 'follow_up_to', 'related')),
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (project_id != related_project_id)
);

create index idx_project_relations_project on project_relations(project_id);
create index idx_project_relations_related on project_relations(related_project_id);
create unique index idx_project_relations_unique on project_relations(project_id, related_project_id, relation_type);

-- ---------------------------------------------------------------------------
-- artifacts — a generic per-project output record (paper, code, dataset,
-- slides, results, notes, website, other). Local path and/or URL, either
-- optional so a purely-remote or purely-local artifact both work.
-- ---------------------------------------------------------------------------
create table artifacts (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  type text not null check (type in ('paper', 'code', 'dataset', 'slides', 'results', 'notes', 'website', 'other')),
  title text not null,
  local_path text,
  url text,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_artifacts_project on artifacts(project_id);

create trigger trg_artifacts_updated_at after update on artifacts
when new.updated_at = old.updated_at
begin
  update artifacts set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- file_index_roots / file_index — explicitly-selected local folders per
-- project, and the (shallow) file listing indexed from them. Never a
-- filesystem scan beyond a folder the PI picked via the native picker.
-- ---------------------------------------------------------------------------
create table file_index_roots (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  category text not null check (category in ('code', 'paper', 'results', 'data', 'slides', 'notes')),
  root_path text not null,
  label text,
  last_indexed_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_file_index_roots_project on file_index_roots(project_id);

create table file_index (
  id text primary key,
  root_id text not null references file_index_roots(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  category text not null,
  name text not null,
  relative_path text not null,
  extension text,
  size_bytes integer not null default 0,
  modified_at text,
  indexed_body text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_file_index_root on file_index(root_id);
create index idx_file_index_project on file_index(project_id);
create unique index idx_file_index_unique on file_index(root_id, relative_path);

-- FTS coverage for indexed files (name always; body only for safe, small
-- text formats — see fileIndexRepository for the extension/size cutoffs).
create trigger trg_search_file_index_ai after insert on file_index begin
  insert into search_index (entity_type, entity_id, title, body) values ('file', new.id, new.name, coalesce(new.indexed_body, ''));
end;
create trigger trg_search_file_index_au after update on file_index begin
  delete from search_index where entity_type = 'file' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body) values ('file', new.id, new.name, coalesce(new.indexed_body, ''));
end;
create trigger trg_search_file_index_ad after delete on file_index begin
  delete from search_index where entity_type = 'file' and entity_id = old.id;
end;

-- ---------------------------------------------------------------------------
-- saved_views — a PI-named, reusable filter preset for a given list page.
-- `filters` is a small controlled JSON object the UI defines and validates
-- (see packages/domain/src/schemas/savedView.ts) — never arbitrary SQL.
-- ---------------------------------------------------------------------------
create table saved_views (
  id text primary key,
  name text not null,
  entity_type text not null check (entity_type in ('projects', 'publications', 'memory')),
  filters text not null default '{}',
  pinned integer not null default 0 check (pinned in (0, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_saved_views_entity_type on saved_views(entity_type);

create trigger trg_saved_views_updated_at after update on saved_views
when new.updated_at = old.updated_at
begin
  update saved_views set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- favorites — lightweight starring of a few entity types, surfaced mainly
-- through the command palette.
-- ---------------------------------------------------------------------------
create table favorites (
  id text primary key,
  entity_type text not null check (entity_type in ('project', 'person', 'publication', 'saved_view')),
  entity_id text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index idx_favorites_unique on favorites(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Project closeout fields — a completed project's durable summary. Nothing
-- else here is duplicated: "key outputs" reads from artifacts,
-- "questions answered"/"key decisions" are computed from
-- research_questions/decision_requests at render time.
-- ---------------------------------------------------------------------------
alter table projects add column outcome text;
alter table projects add column closeout_note text;
alter table projects add column closed_at text;

-- ---------------------------------------------------------------------------
-- Two relation-intelligence links the existing schema has no path for yet:
-- a grant can fund more than one project (many-to-many, so a join table —
-- same shape as project_members), and a decision can optionally record
-- which meeting it came out of (one nullable FK, since a decision has at
-- most one originating meeting).
-- ---------------------------------------------------------------------------
create table grant_projects (
  id text primary key,
  grant_id text not null references grants(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_grant_projects_grant on grant_projects(grant_id);
create index idx_grant_projects_project on grant_projects(project_id);
create unique index idx_grant_projects_unique on grant_projects(grant_id, project_id);

alter table decision_requests add column meeting_id text references meetings(id) on delete set null;
create index idx_decision_requests_meeting on decision_requests(meeting_id);
