-- ============================================================================
-- Local file/folder references (SPEC_followup section 17)
--
-- A lightweight polymorphic table so projects, meetings, publications, and
-- grants can each reference local files/folders the PI explicitly picked
-- via a native picker. These are references only — the app never copies or
-- scans the filesystem on its own (see SPEC_followup section 17/32).
--
-- Project-specific canonical folders (research/git/paper/results) already
-- have their own dedicated columns on `projects` from migration 001; this
-- table is for everything else (an arbitrary paper PDF on a publication, a
-- notes file on a meeting, a proposal doc on a grant, or extra references
-- on a project beyond the four canonical ones).
-- ============================================================================

create table attachments (
  id text primary key,
  entity_type text not null check (entity_type in ('project', 'meeting', 'publication', 'grant')),
  entity_id text not null,
  kind text not null check (kind in ('file', 'folder')),
  label text,
  path text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index idx_attachments_entity on attachments(entity_type, entity_id);
