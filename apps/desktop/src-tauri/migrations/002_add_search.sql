-- ============================================================================
-- Local full-text search (FTS5)
--
-- One search_index virtual table covers every searchable entity type.
-- entity_type/entity_id are UNINDEXED (they're metadata, not text to match
-- against) so results can be resolved back to a real row and routed to the
-- right page. Kept in sync with a delete-then-reinsert trigger per source
-- table, which is the simplest correct approach for a plain (non
-- external-content) FTS5 table and is more than fast enough at the scale of
-- one PI's data.
-- ============================================================================

create virtual table search_index using fts5(
  entity_type unindexed,
  entity_id unindexed,
  title,
  body,
  tokenize = 'porter unicode61'
);

-- ---- projects ----------------------------------------------------------
create trigger trg_search_projects_ai after insert on projects begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('project', new.id, new.title, coalesce(new.short_name, '') || ' ' || coalesce(new.description, ''));
end;

create trigger trg_search_projects_au after update on projects begin
  delete from search_index where entity_type = 'project' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values ('project', new.id, new.title, coalesce(new.short_name, '') || ' ' || coalesce(new.description, ''));
end;

create trigger trg_search_projects_ad after delete on projects begin
  delete from search_index where entity_type = 'project' and entity_id = old.id;
end;

-- ---- people --------------------------------------------------------------
create trigger trg_search_people_ai after insert on people begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('person', new.id, new.name, coalesce(new.bio, '') || ' ' || coalesce(new.research_interests, '') || ' ' || coalesce(new.skills, ''));
end;

create trigger trg_search_people_au after update on people begin
  delete from search_index where entity_type = 'person' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values ('person', new.id, new.name, coalesce(new.bio, '') || ' ' || coalesce(new.research_interests, '') || ' ' || coalesce(new.skills, ''));
end;

create trigger trg_search_people_ad after delete on people begin
  delete from search_index where entity_type = 'person' and entity_id = old.id;
end;

-- ---- project_updates -------------------------------------------------------
create trigger trg_search_updates_ai after insert on project_updates begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('project_update', new.id, new.summary, coalesce(new.progress, '') || ' ' || coalesce(new.blockers, '') || ' ' || coalesce(new.next_steps, ''));
end;

create trigger trg_search_updates_ad after delete on project_updates begin
  delete from search_index where entity_type = 'project_update' and entity_id = old.id;
end;

-- ---- meetings (title/summary/progress/results/blockers AND decisions —
-- decisions matter enough to be first-class searchable per SPEC_followup
-- section 16, so they're folded into body like everything else here) -------
create trigger trg_search_meetings_ai after insert on meetings begin
  insert into search_index (entity_type, entity_id, title, body)
  values (
    'meeting', new.id, new.title,
    coalesce(new.summary, '') || ' ' || coalesce(new.progress, '') || ' ' || coalesce(new.results, '') || ' ' ||
    coalesce(new.blockers, '') || ' ' || coalesce(new.decisions, '') || ' ' || coalesce(new.next_steps, '')
  );
end;

create trigger trg_search_meetings_au after update on meetings begin
  delete from search_index where entity_type = 'meeting' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values (
    'meeting', new.id, new.title,
    coalesce(new.summary, '') || ' ' || coalesce(new.progress, '') || ' ' || coalesce(new.results, '') || ' ' ||
    coalesce(new.blockers, '') || ' ' || coalesce(new.decisions, '') || ' ' || coalesce(new.next_steps, '')
  );
end;

create trigger trg_search_meetings_ad after delete on meetings begin
  delete from search_index where entity_type = 'meeting' and entity_id = old.id;
end;

-- ---- publications ----------------------------------------------------------
create trigger trg_search_publications_ai after insert on publications begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('publication', new.id, new.title, coalesce(new.venue, '') || ' ' || coalesce(new.notes, ''));
end;

create trigger trg_search_publications_au after update on publications begin
  delete from search_index where entity_type = 'publication' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values ('publication', new.id, new.title, coalesce(new.venue, '') || ' ' || coalesce(new.notes, ''));
end;

create trigger trg_search_publications_ad after delete on publications begin
  delete from search_index where entity_type = 'publication' and entity_id = old.id;
end;

-- ---- grants ------------------------------------------------------------
create trigger trg_search_grants_ai after insert on grants begin
  insert into search_index (entity_type, entity_id, title, body)
  values ('grant', new.id, new.title, coalesce(new.funder, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(new.notes, ''));
end;

create trigger trg_search_grants_au after update on grants begin
  delete from search_index where entity_type = 'grant' and entity_id = new.id;
  insert into search_index (entity_type, entity_id, title, body)
  values ('grant', new.id, new.title, coalesce(new.funder, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(new.notes, ''));
end;

create trigger trg_search_grants_ad after delete on grants begin
  delete from search_index where entity_type = 'grant' and entity_id = old.id;
end;
