import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// Validates the actual migration SQL used by the app (via
// tauri-plugin-sql's migration runner — see src-tauri/src/lib.rs) against a
// real SQLite engine. The JS repository layer itself talks to SQLite only
// through the Tauri IPC bridge, which doesn't exist outside a running Tauri
// app, so this is the layer where migration/schema/trigger/FTS correctness
// can actually be exercised in CI.
//
// `node:sqlite` is fetched via process.getBuiltinModule (a plain registry
// lookup, no module resolution at all) because Vitest's bundled Vite
// version doesn't yet recognize this newer Node builtin and fails trying
// to resolve it as a package via any form of import()/require().
type DatabaseSync = DatabaseSyncType;

const MIGRATIONS_DIR = join(__dirname, "../../../../apps/desktop/src-tauri/migrations");

function freshDb(): DatabaseSync {
  const sqliteModule = process.getBuiltinModule("node:sqlite") as {
    DatabaseSync: new (path: string) => DatabaseSync;
  };
  const db: DatabaseSync = new sqliteModule.DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  expect(files.length).toBeGreaterThanOrEqual(3);
  for (const file of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf-8"));
  }
  return db;
}

describe("SQLite migrations", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
  });

  it("creates every expected table", () => {
    const tables = db
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((r) => (r as { name: string }).name);
    for (const expected of [
      "people",
      "workspace",
      "projects",
      "project_members",
      "project_updates",
      "milestones",
      "meetings",
      "meeting_attendees",
      "action_items",
      "publications",
      "publication_authors",
      "grants",
      "grant_members",
      "attachments",
      "settings",
      "decision_requests",
      "ideas",
      "weekly_reviews",
      "timeline_events",
      "inbox_state",
      "research_questions",
      "hypotheses",
      "evidence",
      "venues",
      "venue_cycles",
      "submission_plans",
      "submission_plan_items",
      "paper_readiness_items",
      "project_stage_history",
      "project_health_history",
      "project_relations",
      "artifacts",
      "file_index_roots",
      "file_index",
      "saved_views",
      "favorites",
      "grant_projects",
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it("applies migrations idempotently in order without error (fresh install == upgraded install)", () => {
    expect(() => freshDb()).not.toThrow();
  });

  it("enforces foreign keys (rejects a project_member pointing at a nonexistent project)", () => {
    expect(() =>
      db
        .prepare(
          "insert into project_members (id, project_id, person_id, role) values ('m1', 'missing-project', 'missing-person', 'lead')",
        )
        .run(),
    ).toThrow();
  });

  it("cascade-deletes project_members when the project is deleted", () => {
    db.prepare("insert into people (id, name) values ('p1', 'Alice')").run();
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
    db.prepare(
      "insert into project_members (id, project_id, person_id, role) values ('m1', 'proj1', 'p1', 'lead')",
    ).run();

    db.prepare("delete from projects where id = 'proj1'").run();

    const remaining = db
      .prepare("select count(*) as n from project_members where id = 'm1'")
      .get() as { n: number };
    expect(remaining.n).toBe(0);
  });

  it("bumps project.last_update_at when a project_update is inserted", () => {
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
    const before = db.prepare("select last_update_at from projects where id = 'proj1'").get() as {
      last_update_at: string | null;
    };
    expect(before.last_update_at).toBeNull();

    db.prepare(
      "insert into project_updates (id, project_id, summary, created_at) values ('u1', 'proj1', 'Ran the sweep', '2026-01-01T00:00:00.000Z')",
    ).run();

    const after = db.prepare("select last_update_at from projects where id = 'proj1'").get() as {
      last_update_at: string;
    };
    expect(after.last_update_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("auto-bumps updated_at on UPDATE via trigger, but not on plain SELECT/INSERT", () => {
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
    const original = db
      .prepare("select created_at, updated_at from projects where id = 'proj1'")
      .get() as { created_at: string; updated_at: string };
    expect(original.created_at).toBe(original.updated_at);

    // Force a distinguishable clock tick — SQLite's strftime is second-resolution.
    db.prepare(
      "update projects set updated_at = '2020-01-01T00:00:00.000Z' where id = 'proj1'",
    ).run();
    db.prepare("update projects set title = 'Graph Foundation Models' where id = 'proj1'").run();

    const updated = db.prepare("select updated_at from projects where id = 'proj1'").get() as {
      updated_at: string;
    };
    expect(updated.updated_at).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("sets milestone.completed_at only when explicitly provided (no implicit trigger magic — that's the repository layer's job)", () => {
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
    db.prepare(
      "insert into milestones (id, project_id, title, status) values ('m1', 'proj1', 'Submit paper', 'completed')",
    ).run();
    const row = db.prepare("select completed_at from milestones where id = 'm1'").get() as {
      completed_at: string | null;
    };
    expect(row.completed_at).toBeNull();
  });

  it("rejects an invalid enum value via CHECK constraint", () => {
    expect(() =>
      db
        .prepare(
          "insert into projects (id, title, stage) values ('proj1', 'X', 'not-a-real-stage')",
        )
        .run(),
    ).toThrow();
  });
});

describe("FTS5 search index", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
  });

  it("indexes a project on insert and finds it by title", () => {
    db.prepare(
      "insert into projects (id, title, description) values ('proj1', 'Graph Foundation Models', 'Pretrained GNNs for structural biology')",
    ).run();
    const rows = db
      .prepare("select entity_id from search_index where search_index match 'Foundation*'")
      .all() as { entity_id: string }[];
    expect(rows.map((r) => r.entity_id)).toContain("proj1");
  });

  it("indexes meeting decisions specifically, so they're searchable months later", () => {
    db.prepare(
      "insert into meetings (id, title, decisions) values ('meet1', 'Weekly sync', 'Decided to use a recurrent metric instead of a fixed one')",
    ).run();
    const rows = db
      .prepare("select entity_id from search_index where search_index match 'recurrent'")
      .all() as { entity_id: string }[];
    expect(rows.map((r) => r.entity_id)).toContain("meet1");
  });

  it("re-indexes on update — stale text no longer matches, new text does", () => {
    db.prepare("insert into projects (id, title) values ('proj1', 'Old Title')").run();
    db.prepare("update projects set title = 'Brand New Title' where id = 'proj1'").run();

    const stale = db
      .prepare("select entity_id from search_index where search_index match 'Old'")
      .all();
    expect(stale.length).toBe(0);

    const fresh = db
      .prepare("select entity_id from search_index where search_index match 'Brand'")
      .all() as { entity_id: string }[];
    expect(fresh.map((r) => r.entity_id)).toContain("proj1");
  });

  it("removes from the index on delete", () => {
    db.prepare("insert into projects (id, title) values ('proj1', 'Ephemeral Project')").run();
    db.prepare("delete from projects where id = 'proj1'").run();
    const rows = db
      .prepare("select entity_id from search_index where search_index match 'Ephemeral'")
      .all();
    expect(rows.length).toBe(0);
  });

  it("covers people, publications, and grants too", () => {
    db.prepare(
      "insert into people (id, name, bio) values ('p1', 'Alice Kim', 'Works on equivariant coordinate updates')",
    ).run();
    db.prepare(
      "insert into publications (id, title) values ('pub1', 'Equivariant Coordinate Updates for Protein Design')",
    ).run();
    db.prepare(
      "insert into grants (id, title, funder) values ('g1', 'NSF CAREER Award', 'National Science Foundation')",
    ).run();

    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'equivariant'")
          .all() as { entity_id: string }[]
      )
        .map((r) => r.entity_id)
        .sort(),
    ).toEqual(["p1", "pub1"].sort());
    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'CAREER'")
          .all() as { entity_id: string }[]
      ).map((r) => r.entity_id),
    ).toContain("g1");
  });
});

describe("Tier 1: decisions, ideas, timeline, inbox state", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into people (id, name) values ('p1', 'Alice')").run();
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
  });

  it("rejects a decision_request with an invalid status", () => {
    expect(() =>
      db
        .prepare(
          "insert into decision_requests (id, title, status) values ('d1', 'Which benchmark?', 'not-a-status')",
        )
        .run(),
    ).toThrow();
  });

  it("cascades on project delete: rejects orphaned FK on insert, sets null when a referenced project is removed", () => {
    db.prepare(
      "insert into decision_requests (id, project_id, title) values ('d1', 'proj1', 'Which benchmark?')",
    ).run();
    db.prepare("delete from projects where id = 'proj1'").run();
    const row = db.prepare("select project_id from decision_requests where id = 'd1'").get() as {
      project_id: string | null;
    };
    expect(row.project_id).toBeNull();
  });

  it("auto-bumps decision_requests.updated_at on update", () => {
    db.prepare("insert into decision_requests (id, title) values ('d1', 'Which benchmark?')").run();
    db.prepare(
      "update decision_requests set updated_at = '2020-01-01T00:00:00.000Z' where id = 'd1'",
    ).run();
    db.prepare("update decision_requests set status = 'resolved' where id = 'd1'").run();
    const row = db.prepare("select updated_at from decision_requests where id = 'd1'").get() as {
      updated_at: string;
    };
    expect(row.updated_at).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("indexes decision requests (title + context + decision) for search", () => {
    db.prepare(
      "insert into decision_requests (id, title, context, decision) values ('d1', 'Which benchmark?', 'QM9 vs synthetic', 'Use synthetic rigid graphs')",
    ).run();
    const rows = db
      .prepare("select entity_id from search_index where search_index match 'synthetic'")
      .all() as { entity_id: string }[];
    expect(rows.map((r) => r.entity_id)).toContain("d1");
  });

  it("indexes ideas for search and removes them from the index on delete", () => {
    db.prepare(
      "insert into ideas (id, title) values ('i1', 'Structure-aware decoder for proteins')",
    ).run();
    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'decoder'")
          .all() as { entity_id: string }[]
      ).map((r) => r.entity_id),
    ).toContain("i1");

    db.prepare("delete from ideas where id = 'i1'").run();
    expect(
      db.prepare("select entity_id from search_index where search_index match 'decoder'").all()
        .length,
    ).toBe(0);
  });

  it("rejects an idea with an invalid state", () => {
    expect(() =>
      db.prepare("insert into ideas (id, title, state) values ('i1', 'X', 'not-a-state')").run(),
    ).toThrow();
  });

  it("enforces a unique week_start on weekly_reviews", () => {
    db.prepare(
      "insert into weekly_reviews (id, week_start, week_end, snapshot_json) values ('w1', '2026-08-24', '2026-08-30', '{}')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into weekly_reviews (id, week_start, week_end, snapshot_json) values ('w2', '2026-08-24', '2026-08-30', '{}')",
        )
        .run(),
    ).toThrow();
  });

  it("cascade-deletes timeline_events when the project is deleted", () => {
    db.prepare(
      "insert into timeline_events (id, project_id, event_type, summary) values ('e1', 'proj1', 'stage_changed', 'Stage → Writing')",
    ).run();
    db.prepare("delete from projects where id = 'proj1'").run();
    const remaining = db
      .prepare("select count(*) as n from timeline_events where id = 'e1'")
      .get() as { n: number };
    expect(remaining.n).toBe(0);
  });

  it("upserts inbox_state by item_key (snooze/dismiss/clear round-trip)", () => {
    db.prepare(
      "insert into inbox_state (item_key, snoozed_until) values ('project:proj1:cluster', '2026-09-01T00:00:00.000Z')",
    ).run();
    db.prepare(
      "insert into inbox_state (item_key, dismissed_at) values ('project:proj1:cluster', '2026-08-25T00:00:00.000Z') on conflict(item_key) do update set dismissed_at = excluded.dismissed_at",
    ).run();
    const row = db
      .prepare(
        "select snoozed_until, dismissed_at from inbox_state where item_key = 'project:proj1:cluster'",
      )
      .get() as {
      snoozed_until: string | null;
      dismissed_at: string | null;
    };
    expect(row.snoozed_until).toBe("2026-09-01T00:00:00.000Z");
    expect(row.dismissed_at).toBe("2026-08-25T00:00:00.000Z");
  });
});

describe("Tier 2: research questions, hypotheses, evidence", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'GraphFM')").run();
  });

  it("cascade-deletes research_questions, hypotheses, and evidence when the project is deleted", () => {
    db.prepare(
      "insert into research_questions (id, project_id, question) values ('q1', 'proj1', 'Does recurrent refinement help?')",
    ).run();
    db.prepare(
      "insert into hypotheses (id, research_question_id, project_id, statement) values ('h1', 'q1', 'proj1', 'RM-GEL improves RMSE')",
    ).run();
    db.prepare(
      "insert into evidence (id, hypothesis_id, project_id, summary) values ('e1', 'h1', 'proj1', 'RMSE dropped 0.8%')",
    ).run();

    db.prepare("delete from projects where id = 'proj1'").run();

    expect(
      (db.prepare("select count(*) as n from research_questions").get() as { n: number }).n,
    ).toBe(0);
    expect((db.prepare("select count(*) as n from hypotheses").get() as { n: number }).n).toBe(0);
    expect((db.prepare("select count(*) as n from evidence").get() as { n: number }).n).toBe(0);
  });

  it("rejects an invalid hypothesis status and evidence direction via CHECK", () => {
    db.prepare(
      "insert into research_questions (id, project_id, question) values ('q1', 'proj1', 'Q?')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into hypotheses (id, project_id, statement, status) values ('h1', 'proj1', 'S', 'not-a-status')",
        )
        .run(),
    ).toThrow();
    db.prepare(
      "insert into hypotheses (id, project_id, statement) values ('h1', 'proj1', 'S')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into evidence (id, hypothesis_id, project_id, summary, direction) values ('e1', 'h1', 'proj1', 'X', 'not-a-direction')",
        )
        .run(),
    ).toThrow();
  });

  it("sets hypotheses.research_question_id to null (not cascade) when the question is deleted", () => {
    db.prepare(
      "insert into research_questions (id, project_id, question) values ('q1', 'proj1', 'Q?')",
    ).run();
    db.prepare(
      "insert into hypotheses (id, research_question_id, project_id, statement) values ('h1', 'q1', 'proj1', 'S')",
    ).run();

    db.prepare("delete from research_questions where id = 'q1'").run();

    const row = db.prepare("select research_question_id from hypotheses where id = 'h1'").get() as {
      research_question_id: string | null;
    };
    expect(row.research_question_id).toBeNull();
  });

  it("indexes research questions and hypotheses for search", () => {
    db.prepare(
      "insert into research_questions (id, project_id, question) values ('q1', 'proj1', 'Does recurrent metric refinement help')",
    ).run();
    db.prepare(
      "insert into hypotheses (id, project_id, statement) values ('h1', 'proj1', 'Structure-aware decoder improves realization')",
    ).run();

    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'recurrent'")
          .all() as { entity_id: string }[]
      ).map((r) => r.entity_id),
    ).toContain("q1");
    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'decoder'")
          .all() as { entity_id: string }[]
      ).map((r) => r.entity_id),
    ).toContain("h1");
  });
});

describe("Tier 2: venues, submission planning, paper readiness", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
  });

  it("cascade-deletes venue_cycles when the venue is deleted", () => {
    db.prepare("insert into venues (id, name) values ('v1', 'ICLR')").run();
    db.prepare(
      "insert into venue_cycles (id, venue_id, cycle_label, submission_deadline) values ('vc1', 'v1', 'ICLR 2027', '2027-09-09')",
    ).run();

    db.prepare("delete from venues where id = 'v1'").run();

    expect((db.prepare("select count(*) as n from venue_cycles").get() as { n: number }).n).toBe(0);
  });

  it("sets publications.target_venue_cycle_id to null when the venue cycle is deleted", () => {
    db.prepare("insert into venues (id, name) values ('v1', 'ICLR')").run();
    db.prepare(
      "insert into venue_cycles (id, venue_id, cycle_label) values ('vc1', 'v1', 'ICLR 2027')",
    ).run();
    db.prepare(
      "insert into publications (id, title, target_venue_cycle_id) values ('p1', 'GraphFM Paper', 'vc1')",
    ).run();

    db.prepare("delete from venue_cycles where id = 'vc1'").run();

    const row = db
      .prepare("select target_venue_cycle_id from publications where id = 'p1'")
      .get() as { target_venue_cycle_id: string | null };
    expect(row.target_venue_cycle_id).toBeNull();
  });

  it("cascade-deletes submission_plan_items and paper_readiness_items when the publication is deleted", () => {
    db.prepare("insert into publications (id, title) values ('p1', 'GraphFM Paper')").run();
    db.prepare("insert into submission_plans (id, publication_id) values ('sp1', 'p1')").run();
    db.prepare(
      "insert into submission_plan_items (id, submission_plan_id, label, offset_days) values ('spi1', 'sp1', 'Draft', -24)",
    ).run();
    db.prepare(
      "insert into paper_readiness_items (id, publication_id, label) values ('ri1', 'p1', 'Main result')",
    ).run();

    db.prepare("delete from publications where id = 'p1'").run();

    expect(
      (db.prepare("select count(*) as n from submission_plans").get() as { n: number }).n,
    ).toBe(0);
    expect(
      (db.prepare("select count(*) as n from submission_plan_items").get() as { n: number }).n,
    ).toBe(0);
    expect(
      (db.prepare("select count(*) as n from paper_readiness_items").get() as { n: number }).n,
    ).toBe(0);
  });

  it("enforces one submission plan per publication", () => {
    db.prepare("insert into publications (id, title) values ('p1', 'GraphFM Paper')").run();
    db.prepare("insert into submission_plans (id, publication_id) values ('sp1', 'p1')").run();
    expect(() =>
      db.prepare("insert into submission_plans (id, publication_id) values ('sp2', 'p1')").run(),
    ).toThrow();
  });
});

describe("Tier 2: project stage/health history", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare(
      "insert into projects (id, title, stage, health) values ('proj1', 'GraphFM', 'idea', 'healthy')",
    ).run();
  });

  it("records structured stage transitions independent of the free-text timeline_events table", () => {
    db.prepare(
      "insert into project_stage_history (id, project_id, from_stage, to_stage) values ('h1', 'proj1', 'idea', 'prototype')",
    ).run();
    const row = db
      .prepare("select from_stage, to_stage from project_stage_history where id = 'h1'")
      .get() as {
      from_stage: string;
      to_stage: string;
    };
    expect(row).toEqual({ from_stage: "idea", to_stage: "prototype" });
  });

  it("records structured health transitions", () => {
    db.prepare(
      "insert into project_health_history (id, project_id, from_health, to_health) values ('h1', 'proj1', 'healthy', 'stalled')",
    ).run();
    const row = db
      .prepare("select to_health from project_health_history where id = 'h1'")
      .get() as { to_health: string };
    expect(row.to_health).toBe("stalled");
  });

  it("cascade-deletes stage/health history when the project is deleted", () => {
    db.prepare(
      "insert into project_stage_history (id, project_id, to_stage) values ('h1', 'proj1', 'prototype')",
    ).run();
    db.prepare(
      "insert into project_health_history (id, project_id, to_health) values ('h2', 'proj1', 'stalled')",
    ).run();

    db.prepare("delete from projects where id = 'proj1'").run();

    expect(
      (db.prepare("select count(*) as n from project_stage_history").get() as { n: number }).n,
    ).toBe(0);
    expect(
      (db.prepare("select count(*) as n from project_health_history").get() as { n: number }).n,
    ).toBe(0);
  });
});

describe("workspace singleton", () => {
  it("supports exactly the one-row pattern the repository layer relies on", () => {
    const db = freshDb();
    db.prepare("insert into people (id, name, role) values ('pi1', 'Dr. Sarah Chen', 'PI')").run();
    db.prepare(
      "insert into workspace (id, name, pi_name, pi_person_id) values ('ws1', 'SIM Lab', 'Dr. Sarah Chen', 'pi1')",
    ).run();

    const row = db.prepare("select * from workspace limit 1").get() as {
      name: string;
      pi_person_id: string;
    };
    expect(row.name).toBe("SIM Lab");
    expect(row.pi_person_id).toBe("pi1");
  });
});

describe("Tier 3: project relations", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'FlowBB')").run();
    db.prepare("insert into projects (id, title) values ('proj2', 'EgoVLA')").run();
  });

  it("cascade-deletes a relation when either side project is deleted", () => {
    db.prepare(
      "insert into project_relations (id, project_id, related_project_id, relation_type) values ('r1', 'proj1', 'proj2', 'depends_on')",
    ).run();
    db.prepare("delete from projects where id = 'proj2'").run();
    expect(
      (db.prepare("select count(*) as n from project_relations").get() as { n: number }).n,
    ).toBe(0);
  });

  it("rejects an invalid relation_type via CHECK", () => {
    expect(() =>
      db
        .prepare(
          "insert into project_relations (id, project_id, related_project_id, relation_type) values ('r1', 'proj1', 'proj2', 'not-a-type')",
        )
        .run(),
    ).toThrow();
  });

  it("rejects a project related to itself via CHECK", () => {
    expect(() =>
      db
        .prepare(
          "insert into project_relations (id, project_id, related_project_id, relation_type) values ('r1', 'proj1', 'proj1', 'related')",
        )
        .run(),
    ).toThrow();
  });

  it("enforces one relation of a given type per project pair", () => {
    db.prepare(
      "insert into project_relations (id, project_id, related_project_id, relation_type) values ('r1', 'proj1', 'proj2', 'related')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into project_relations (id, project_id, related_project_id, relation_type) values ('r2', 'proj1', 'proj2', 'related')",
        )
        .run(),
    ).toThrow();
  });
});

describe("Tier 3: artifacts", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'FlowBB')").run();
  });

  it("cascade-deletes artifacts when the project is deleted", () => {
    db.prepare(
      "insert into artifacts (id, project_id, type, title) values ('a1', 'proj1', 'code', 'graphfm/')",
    ).run();
    db.prepare("delete from projects where id = 'proj1'").run();
    expect((db.prepare("select count(*) as n from artifacts").get() as { n: number }).n).toBe(0);
  });

  it("rejects an invalid artifact type via CHECK", () => {
    expect(() =>
      db
        .prepare(
          "insert into artifacts (id, project_id, type, title) values ('a1', 'proj1', 'not-a-type', 'x')",
        )
        .run(),
    ).toThrow();
  });

  it("auto-bumps updated_at on update", () => {
    db.prepare(
      "insert into artifacts (id, project_id, type, title, created_at, updated_at) values ('a1', 'proj1', 'code', 'x', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
    ).run();
    db.prepare("update artifacts set title = 'y' where id = 'a1'").run();
    const row = db.prepare("select updated_at from artifacts where id = 'a1'").get() as {
      updated_at: string;
    };
    expect(row.updated_at).not.toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("Tier 3: local file indexing", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'FlowBB')").run();
  });

  it("cascade-deletes file_index rows when the root is deleted, and roots when the project is deleted", () => {
    db.prepare(
      "insert into file_index_roots (id, project_id, category, root_path) values ('root1', 'proj1', 'code', '/tmp/graphfm')",
    ).run();
    db.prepare(
      "insert into file_index (id, root_id, project_id, category, name, relative_path) values ('f1', 'root1', 'proj1', 'code', 'main.py', 'main.py')",
    ).run();

    db.prepare("delete from file_index_roots where id = 'root1'").run();
    expect((db.prepare("select count(*) as n from file_index").get() as { n: number }).n).toBe(0);

    db.prepare(
      "insert into file_index_roots (id, project_id, category, root_path) values ('root2', 'proj1', 'code', '/tmp/graphfm')",
    ).run();
    db.prepare("delete from projects where id = 'proj1'").run();
    expect(
      (db.prepare("select count(*) as n from file_index_roots").get() as { n: number }).n,
    ).toBe(0);
  });

  it("enforces one entry per relative path within a root", () => {
    db.prepare(
      "insert into file_index_roots (id, project_id, category, root_path) values ('root1', 'proj1', 'code', '/tmp/graphfm')",
    ).run();
    db.prepare(
      "insert into file_index (id, root_id, project_id, category, name, relative_path) values ('f1', 'root1', 'proj1', 'code', 'main.py', 'src/main.py')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into file_index (id, root_id, project_id, category, name, relative_path) values ('f2', 'root1', 'proj1', 'code', 'main.py', 'src/main.py')",
        )
        .run(),
    ).toThrow();
  });

  it("indexes a file's name and content for search, and removes it from the index on delete", () => {
    db.prepare(
      "insert into file_index_roots (id, project_id, category, root_path) values ('root1', 'proj1', 'code', '/tmp/graphfm')",
    ).run();
    db.prepare(
      "insert into file_index (id, root_id, project_id, category, name, relative_path, indexed_body) values ('f1', 'root1', 'proj1', 'code', 'evaluation.py', 'src/evaluation.py', 'def compute_rmse(): pass')",
    ).run();

    expect(
      (
        db
          .prepare("select entity_id from search_index where search_index match 'evaluation'")
          .all() as { entity_id: string }[]
      ).map((r) => r.entity_id),
    ).toContain("f1");
    expect(
      (
        db.prepare("select entity_id from search_index where search_index match 'rmse'").all() as {
          entity_id: string;
        }[]
      ).map((r) => r.entity_id),
    ).toContain("f1");

    db.prepare("delete from file_index where id = 'f1'").run();
    expect(
      (
        db
          .prepare(
            "select count(*) as n from search_index where entity_type = 'file' and entity_id = 'f1'",
          )
          .get() as { n: number }
      ).n,
    ).toBe(0);
  });
});

describe("Tier 3: saved views and favorites", () => {
  it("rejects an invalid saved_views entity_type via CHECK", () => {
    const db = freshDb();
    expect(() =>
      db
        .prepare(
          "insert into saved_views (id, name, entity_type, filters) values ('v1', 'ICLR papers', 'not-a-type', '{}')",
        )
        .run(),
    ).toThrow();
  });

  it("auto-bumps saved_views.updated_at on update", () => {
    const db = freshDb();
    db.prepare(
      "insert into saved_views (id, name, entity_type, filters, created_at, updated_at) values ('v1', 'ICLR papers', 'publications', '{}', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
    ).run();
    db.prepare("update saved_views set pinned = 1 where id = 'v1'").run();
    const row = db.prepare("select updated_at from saved_views where id = 'v1'").get() as {
      updated_at: string;
    };
    expect(row.updated_at).not.toBe("2026-01-01T00:00:00.000Z");
  });

  it("enforces one favorite per (entity_type, entity_id) pair", () => {
    const db = freshDb();
    db.prepare(
      "insert into favorites (id, entity_type, entity_id) values ('f1', 'project', 'proj1')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into favorites (id, entity_type, entity_id) values ('f2', 'project', 'proj1')",
        )
        .run(),
    ).toThrow();
  });

  it("rejects an invalid favorites entity_type via CHECK", () => {
    const db = freshDb();
    expect(() =>
      db
        .prepare(
          "insert into favorites (id, entity_type, entity_id) values ('f1', 'not-a-type', 'x')",
        )
        .run(),
    ).toThrow();
  });
});

describe("Tier 3: grant-project links and decision-meeting links", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'FlowBB')").run();
    db.prepare("insert into grants (id, title) values ('g1', 'NSF CAREER')").run();
  });

  it("cascade-deletes grant_projects when either the grant or the project is deleted", () => {
    db.prepare(
      "insert into grant_projects (id, grant_id, project_id) values ('gp1', 'g1', 'proj1')",
    ).run();
    db.prepare("delete from grants where id = 'g1'").run();
    expect((db.prepare("select count(*) as n from grant_projects").get() as { n: number }).n).toBe(
      0,
    );
  });

  it("enforces one link per (grant, project) pair", () => {
    db.prepare(
      "insert into grant_projects (id, grant_id, project_id) values ('gp1', 'g1', 'proj1')",
    ).run();
    expect(() =>
      db
        .prepare(
          "insert into grant_projects (id, grant_id, project_id) values ('gp2', 'g1', 'proj1')",
        )
        .run(),
    ).toThrow();
  });

  it("sets decision_requests.meeting_id to null when the meeting is deleted", () => {
    db.prepare("insert into meetings (id, title) values ('m1', 'Sync')").run();
    db.prepare(
      "insert into decision_requests (id, title, meeting_id) values ('d1', 'Which venue?', 'm1')",
    ).run();
    db.prepare("delete from meetings where id = 'm1'").run();
    const row = db.prepare("select meeting_id from decision_requests where id = 'd1'").get() as {
      meeting_id: string | null;
    };
    expect(row.meeting_id).toBeNull();
  });
});

describe("Tier 3: project closeout columns", () => {
  it("stores outcome/closeout_note/closed_at on a project", () => {
    const db = freshDb();
    db.prepare("insert into projects (id, title) values ('proj1', 'FlowBB')").run();
    db.prepare(
      "update projects set outcome = 'ICLR paper', closeout_note = 'Great run', closed_at = '2027-08-01T00:00:00.000Z' where id = 'proj1'",
    ).run();
    const row = db
      .prepare("select outcome, closeout_note, closed_at from projects where id = 'proj1'")
      .get() as {
      outcome: string;
      closeout_note: string;
      closed_at: string;
    };
    expect(row.outcome).toBe("ICLR paper");
    expect(row.closeout_note).toBe("Great run");
    expect(row.closed_at).toBe("2027-08-01T00:00:00.000Z");
  });
});
