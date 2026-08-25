-- ============================================================================
-- Tier 2: Research questions/hypotheses/evidence, venue calendar, submission
-- planning, paper readiness, and structured project-stage history.
--
-- project_stage_history is the authoritative source for stage transitions
-- from this migration forward (needed for stage-aging/movement analytics,
-- which `timeline_events`' free-text summaries can't support). Existing
-- timeline_events rows are left as-is for the project timeline UI's older
-- entries; going forward, stage changes are recorded here instead —
-- timeline_events keeps only health_changed. This is a deliberate scope
-- boundary (SPEC_followup_2 section 51): do not reconstruct unreliable
-- historical stage data from updated_at, just start tracking cleanly now.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- research_questions
-- ---------------------------------------------------------------------------
create table research_questions (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  question text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'answered', 'parked')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at text
);

create index idx_research_questions_project on research_questions(project_id);

create trigger trg_research_questions_updated_at after update on research_questions
when new.updated_at = old.updated_at
begin
  update research_questions set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- hypotheses
-- ---------------------------------------------------------------------------
create table hypotheses (
  id text primary key,
  research_question_id text references research_questions(id) on delete set null,
  project_id text not null references projects(id) on delete cascade,
  statement text not null,
  status text not null default 'untested' check (status in ('untested', 'testing', 'supported', 'mixed', 'not_supported')),
  confidence text check (confidence in ('low', 'medium', 'high')),
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at text
);

create index idx_hypotheses_project on hypotheses(project_id);
create index idx_hypotheses_question on hypotheses(research_question_id);

create trigger trg_hypotheses_updated_at after update on hypotheses
when new.updated_at = old.updated_at
begin
  update hypotheses set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- evidence — connects a hypothesis to whatever supports or contradicts it.
-- Not a general experiment tracker: `source_type`/`source_id` are an
-- optional loose pointer (e.g. "project_update" + its id) the UI can use to
-- link back, never a required foreign key.
-- ---------------------------------------------------------------------------
create table evidence (
  id text primary key,
  hypothesis_id text not null references hypotheses(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  type text not null default 'observation' check (type in ('experiment', 'analysis', 'paper', 'observation', 'meeting', 'other')),
  summary text not null,
  direction text not null default 'neutral' check (direction in ('supports', 'contradicts', 'mixed', 'neutral')),
  source_type text,
  source_id text,
  local_path text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_evidence_hypothesis on evidence(hypothesis_id);
create index idx_evidence_project on evidence(project_id);

create trigger trg_evidence_updated_at after update on evidence
when new.updated_at = old.updated_at
begin
  update evidence set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- ---------------------------------------------------------------------------
-- venues / venue_cycles — a local, manually-maintained conference/journal
-- calendar. No internet lookups (SPEC_followup_2 section 13/52).
-- ---------------------------------------------------------------------------
create table venues (
  id text primary key,
  name text not null,
  short_name text,
  category text not null default 'conference' check (category in ('conference', 'journal', 'workshop', 'grant', 'other')),
  website_url text,
  notes text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create trigger trg_venues_updated_at after update on venues
when new.updated_at = old.updated_at
begin
  update venues set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create table venue_cycles (
  id text primary key,
  venue_id text not null references venues(id) on delete cascade,
  cycle_label text not null,
  abstract_deadline text,
  submission_deadline text,
  rebuttal_start text,
  rebuttal_end text,
  notification_date text,
  camera_ready_date text,
  event_start text,
  event_end text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_venue_cycles_venue on venue_cycles(venue_id);
create index idx_venue_cycles_submission_deadline on venue_cycles(submission_deadline);

create trigger trg_venue_cycles_updated_at after update on venue_cycles
when new.updated_at = old.updated_at
begin
  update venue_cycles set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

-- A publication may optionally target a specific venue cycle.
alter table publications add column target_venue_cycle_id text references venue_cycles(id) on delete set null;

-- ---------------------------------------------------------------------------
-- submission_plans / submission_plan_items — internal milestones generated
-- backward from a venue cycle's official submission_deadline. Offsets are
-- stored relative (days from the deadline, negative = before) so the plan
-- stays correct if the target deadline is later edited.
-- ---------------------------------------------------------------------------
create table submission_plans (
  id text primary key,
  publication_id text not null references publications(id) on delete cascade,
  venue_cycle_id text references venue_cycles(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index idx_submission_plans_publication on submission_plans(publication_id);

create trigger trg_submission_plans_updated_at after update on submission_plans
when new.updated_at = old.updated_at
begin
  update submission_plans set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create table submission_plan_items (
  id text primary key,
  submission_plan_id text not null references submission_plans(id) on delete cascade,
  label text not null,
  offset_days integer not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  completed_at text,
  sort_order integer not null default 0
);

create index idx_submission_plan_items_plan on submission_plan_items(submission_plan_id);

-- ---------------------------------------------------------------------------
-- paper_readiness_items — a small, customizable checklist per publication.
-- ---------------------------------------------------------------------------
create table paper_readiness_items (
  id text primary key,
  publication_id text not null references publications(id) on delete cascade,
  label text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done', 'not_applicable')),
  sort_order integer not null default 0
);

create index idx_paper_readiness_items_publication on paper_readiness_items(publication_id);

-- ---------------------------------------------------------------------------
-- project_stage_history — structured stage-transition log, authoritative
-- for stage-aging/movement analytics (see comment at top of file).
-- ---------------------------------------------------------------------------
create table project_stage_history (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_project_stage_history_project on project_stage_history(project_id, changed_at);

-- Structured health-transition log, mirroring project_stage_history.
-- Supersedes timeline_events' health_changed rows (same cutover rationale
-- as project_stage_history vs. the old stage_changed rows) — both the
-- project timeline UI and the portfolio health-trend chart read from here
-- going forward, formatting the display label at query time instead of
-- parsing it back out of stored text.
create table project_health_history (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  from_health text,
  to_health text not null,
  changed_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_project_health_history_project on project_health_history(project_id, changed_at);

-- ---------------------------------------------------------------------------
-- FTS coverage for research questions and hypotheses.
-- ---------------------------------------------------------------------------
create trigger trg_search_research_questions_ai after insert on research_questions begin
  insert into search_index (entity_type, entity_id, title, body) values ('research_question', new.id, new.question, '');
end;
create trigger trg_search_research_questions_au after update on research_questions begin
  delete from search_index where entity_type = 'research_question' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body) values ('research_question', new.id, new.question, '');
end;
create trigger trg_search_research_questions_ad after delete on research_questions begin
  delete from search_index where entity_type = 'research_question' and entity_id = old.id;
end;

create trigger trg_search_hypotheses_ai after insert on hypotheses begin
  insert into search_index (entity_type, entity_id, title, body) values ('hypothesis', new.id, new.statement, coalesce(new.notes, ''));
end;
create trigger trg_search_hypotheses_au after update on hypotheses begin
  delete from search_index where entity_type = 'hypothesis' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body) values ('hypothesis', new.id, new.statement, coalesce(new.notes, ''));
end;
create trigger trg_search_hypotheses_ad after delete on hypotheses begin
  delete from search_index where entity_type = 'hypothesis' and entity_id = old.id;
end;
