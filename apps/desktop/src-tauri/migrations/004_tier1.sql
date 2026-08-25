-- ============================================================================
-- Tier 1: PI Inbox, Decision Requests, Ideas, Project Timeline, Weekly Review
--
-- Philosophy: persist only what cannot be derived. Timeline entries for
-- updates/milestones/meetings/decisions/publications are computed at read
-- time from existing tables (see timelineRepository) — `timeline_events`
-- exists only for stage/health changes, which have no other history.
-- Inbox items are computed at read time from existing signals (see
-- inboxRepository/domain/inbox.ts) — `inbox_state` persists only the
-- user-specific bits (snooze/dismiss) keyed by a stable derived item key.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- decision_requests — a question the PI needs to answer, optionally scoped
-- to a project and/or a person. Resolving one writes a permanent,
-- searchable record (decision + rationale) that shows up on the project
-- timeline and in search — this table doubles as that history.
-- ---------------------------------------------------------------------------
create table decision_requests (
  id text primary key,
  project_id text references projects(id) on delete set null,
  person_id text references people(id) on delete set null,
  title text not null,
  context text,
  options_json text,
  recommendation text,
  decision text,
  rationale text,
  status text not null default 'open' check (status in ('open', 'resolved', 'deferred')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at text,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_decision_requests_project on decision_requests(project_id);
create index idx_decision_requests_status on decision_requests(status);

create trigger trg_decision_requests_updated_at after update on decision_requests
when new.updated_at = old.updated_at
begin
  update decision_requests set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- ideas — a fast-capture research idea inbox. Deliberately almost no
-- required fields: capture speed matters more than completeness up front.
-- ---------------------------------------------------------------------------
create table ideas (
  id text primary key,
  title text not null,
  related_project_id text references projects(id) on delete set null,
  tags_json text not null default '[]',
  state text not null default 'inbox' check (state in ('inbox', 'promising', 'incubating', 'converted', 'archived')),
  converted_project_id text references projects(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_ideas_state on ideas(state);

create trigger trg_ideas_updated_at after update on ideas
when new.updated_at = old.updated_at
begin
  update ideas set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- weekly_reviews — a frozen snapshot per week. Computed once from live data
-- and stored as JSON so a saved review never changes retroactively, even as
-- the underlying projects/people/decisions keep moving.
-- ---------------------------------------------------------------------------
create table weekly_reviews (
  id text primary key,
  week_start text not null,
  week_end text not null,
  snapshot_json text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index idx_weekly_reviews_week on weekly_reviews(week_start);

-- ---------------------------------------------------------------------------
-- timeline_events — ONLY stage/health transitions (the one piece of project
-- history that genuinely has no other source of truth). Every other
-- timeline entry type is derived dynamically at read time.
-- ---------------------------------------------------------------------------
create table timeline_events (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  event_type text not null check (event_type in ('stage_changed', 'health_changed')),
  summary text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_timeline_events_project on timeline_events(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- inbox_state — user-specific state for a derived Inbox row, keyed by a
-- stable deterministic string (e.g. "project:{id}:stale"), never a foreign
-- key to a specific signal table since the signal itself isn't stored here.
-- ---------------------------------------------------------------------------
create table inbox_state (
  item_key text primary key,
  snoozed_until text,
  dismissed_at text,
  last_seen_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- FTS coverage for decision requests and ideas (SPEC_followup section 37).
-- Weekly reviews are periodic snapshots, not free text, so they're excluded
-- from full-text search; they're browsed by week instead.
-- ---------------------------------------------------------------------------
create trigger trg_search_decision_requests_ai after insert on decision_requests begin
  insert into search_index (entity_type, entity_id, title, body)
  values (
    'decision_request', new.id, new.title,
    coalesce(new.context, '') || ' ' || coalesce(new.recommendation, '') || ' ' || coalesce(new.decision, '') || ' ' || coalesce(new.rationale, '')
  );
end;

create trigger trg_search_decision_requests_au after update on decision_requests begin
  delete from search_index where entity_type = 'decision_request' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values (
    'decision_request', new.id, new.title,
    coalesce(new.context, '') || ' ' || coalesce(new.recommendation, '') || ' ' || coalesce(new.decision, '') || ' ' || coalesce(new.rationale, '')
  );
end;

create trigger trg_search_decision_requests_ad after delete on decision_requests begin
  delete from search_index where entity_type = 'decision_request' and entity_id = old.id;
end;

create trigger trg_search_ideas_ai after insert on ideas begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('idea', new.id, new.title, coalesce(new.tags_json, ''));
end;

create trigger trg_search_ideas_au after update on ideas begin
  delete from search_index where entity_type = 'idea' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values ('idea', new.id, new.title, coalesce(new.tags_json, ''));
end;

create trigger trg_search_ideas_ad after delete on ideas begin
  delete from search_index where entity_type = 'idea' and entity_id = old.id;
end;
