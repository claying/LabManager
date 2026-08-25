import { describe, expect, it } from "vitest";
import { computeInboxItems, sortInboxItems, type InboxComputeInput } from "./inbox";

const now = new Date("2026-06-15T00:00:00Z");

function baseInput(overrides: Partial<InboxComputeInput> = {}): InboxComputeInput {
  return {
    projects: [],
    milestones: [],
    publications: [],
    grants: [],
    decisions: [],
    people: [],
    actionItems: [],
    ...overrides,
  };
}

describe("computeInboxItems", () => {
  it("produces no items for a fresh, healthy project with nothing due", () => {
    const items = computeInboxItems(
      baseInput({
        projects: [
          {
            id: "p1",
            title: "GeoFlow",
            short_name: "GeoFlow",
            health: "healthy",
            archived: false,
            last_update_at: now.toISOString(),
            next_milestone: null,
            next_milestone_date: null,
            latestUpdateBlockers: null,
            leadName: "Marcus",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("flags a project with no update in 18 days as stale", () => {
    const items = computeInboxItems(
      baseInput({
        projects: [
          {
            id: "p1",
            title: "Functional Regions",
            short_name: null,
            health: "healthy",
            archived: false,
            last_update_at: "2026-05-28T00:00:00Z", // 18 days before `now`
            next_milestone: null,
            next_milestone_date: null,
            latestUpdateBlockers: null,
            leadName: null,
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "project:p1:cluster",
      group: "stale",
      context: "18d stale",
    });
  });

  it("flags an overdue milestone", () => {
    const items = computeInboxItems(
      baseInput({
        projects: [
          {
            id: "p1",
            title: "GraphFM",
            short_name: "GraphFM",
            health: "healthy",
            archived: false,
            last_update_at: now.toISOString(),
            next_milestone: "Ablation",
            next_milestone_date: "2026-06-11T00:00:00Z",
            latestUpdateBlockers: null,
            leadName: null,
          },
        ],
        milestones: [
          {
            id: "m1",
            project_id: "p1",
            project_title: "GraphFM",
            title: "Ablation",
            due_date: "2026-06-11T00:00:00Z",
            status: "in_progress",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.context).toContain("milestone 4d overdue");
    expect(items[0]?.severity).toBe("critical");
  });

  it("merges stale + overdue milestone + blocked into a single row for the same project", () => {
    const items = computeInboxItems(
      baseInput({
        projects: [
          {
            id: "p1",
            title: "GraphFM",
            short_name: "GraphFM",
            health: "stalled",
            archived: false,
            last_update_at: "2026-05-28T00:00:00Z", // 18 days ago
            next_milestone: "Ablation",
            next_milestone_date: "2026-06-11T00:00:00Z", // 4 days overdue
            latestUpdateBlockers: "Cluster scheduler bug",
            leadName: "Alice",
          },
        ],
        milestones: [
          {
            id: "m1",
            project_id: "p1",
            project_title: "GraphFM",
            title: "Ablation",
            due_date: "2026-06-11T00:00:00Z",
            status: "in_progress",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("project:p1:cluster");
    expect(items[0]?.signals.length).toBeGreaterThan(1);
  });

  it("does not flag an archived project", () => {
    const items = computeInboxItems(
      baseInput({
        projects: [
          {
            id: "p1",
            title: "Old",
            short_name: null,
            health: "stalled",
            archived: true,
            last_update_at: "2026-01-01T00:00:00Z",
            next_milestone: null,
            next_milestone_date: null,
            latestUpdateBlockers: "still broken",
            leadName: null,
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("includes an open decision request in the decide group", () => {
    const items = computeInboxItems(
      baseInput({
        decisions: [
          {
            id: "d1",
            title: "Which benchmark?",
            project_id: "p1",
            project_title: "GraphFM",
            person_name: null,
            priority: "important",
            status: "open",
          },
          {
            id: "d2",
            title: "Old, already resolved",
            project_id: "p1",
            project_title: "GraphFM",
            person_name: null,
            priority: "normal",
            status: "resolved",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: "decision:d1:open", group: "decide" });
  });

  it("flags a publication deadline within 14 days but not one 60 days out", () => {
    const items = computeInboxItems(
      baseInput({
        publications: [
          {
            id: "pub1",
            title: "Paper X",
            status: "drafting",
            submission_deadline: "2026-06-20T00:00:00Z",
          },
          {
            id: "pub2",
            title: "Paper Y",
            status: "drafting",
            submission_deadline: "2026-08-20T00:00:00Z",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("publication:pub1:deadline");
  });

  it("ignores a publication deadline once the publication is submitted", () => {
    const items = computeInboxItems(
      baseInput({
        publications: [
          {
            id: "pub1",
            title: "Paper X",
            status: "submitted",
            submission_deadline: "2026-06-16T00:00:00Z",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("flags a person not seen 1:1 in 14+ days", () => {
    const items = computeInboxItems(
      baseInput({
        people: [
          {
            id: "person1",
            name: "Carol",
            status: "active",
            lastOneOnOneAt: "2026-06-01T00:00:00Z",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "person:person1:no_1on1",
      group: "follow_up",
      context: "14d since 1:1",
    });
  });

  it("does not flag an inactive person", () => {
    const items = computeInboxItems(
      baseInput({
        people: [
          {
            id: "person1",
            name: "Former Student",
            status: "alumni",
            lastOneOnOneAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("flags an overdue open action item", () => {
    const items = computeInboxItems(
      baseInput({
        actionItems: [
          {
            id: "a1",
            title: "Rerun ablation",
            project_title: "GraphFM",
            assignee_name: "Alice",
            due_date: "2026-06-10T00:00:00Z",
            status: "open",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("action_item:a1:overdue");
  });

  it("does not flag a completed action item even if its due date passed", () => {
    const items = computeInboxItems(
      baseInput({
        actionItems: [
          {
            id: "a1",
            title: "Rerun ablation",
            project_title: "GraphFM",
            assignee_name: "Alice",
            due_date: "2026-06-10T00:00:00Z",
            status: "done",
          },
        ],
      }),
      now,
    );
    expect(items).toHaveLength(0);
  });
});

describe("sortInboxItems", () => {
  it("orders by group priority: decide, blocked, stale, due_soon, follow_up", () => {
    const items = computeInboxItems(
      baseInput({
        decisions: [
          {
            id: "d1",
            title: "Q",
            project_id: null,
            project_title: null,
            person_name: null,
            priority: "normal",
            status: "open",
          },
        ],
        people: [
          {
            id: "person1",
            name: "Carol",
            status: "active",
            lastOneOnOneAt: "2026-06-01T00:00:00Z",
          },
        ],
        publications: [
          {
            id: "pub1",
            title: "Paper X",
            status: "drafting",
            submission_deadline: "2026-06-18T00:00:00Z",
          },
        ],
        projects: [
          {
            id: "p1",
            title: "Stalled Co",
            short_name: null,
            health: "healthy",
            archived: false,
            last_update_at: "2026-05-20T00:00:00Z",
            next_milestone: null,
            next_milestone_date: null,
            latestUpdateBlockers: null,
            leadName: null,
          },
        ],
      }),
      now,
    );
    const sorted = sortInboxItems(items);
    expect(sorted.map((i) => i.group)).toEqual(["decide", "stale", "due_soon", "follow_up"]);
  });
});
