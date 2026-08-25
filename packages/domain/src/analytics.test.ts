import { describe, expect, it } from "vitest";
import {
  weekBuckets,
  weekBucketsForward,
  monthBuckets,
  groupByWeek,
  groupByMonth,
  computeStageAging,
  computeProjectMovement,
  computeHealthTrend,
  computeDeadlineLoad,
  computeSubmissionLoad,
  computeActivityByWeek,
} from "./analytics";

const now = new Date("2026-08-25T12:00:00Z"); // a Tuesday

describe("weekBuckets", () => {
  it("returns N Monday-start weeks ending in the week containing now", () => {
    const buckets = weekBuckets(3, now);
    expect(buckets).toEqual(["2026-08-10", "2026-08-17", "2026-08-24"]);
  });
});

describe("weekBucketsForward", () => {
  it("returns N Monday-start weeks starting from the week containing now", () => {
    const buckets = weekBucketsForward(3, now);
    expect(buckets).toEqual(["2026-08-24", "2026-08-31", "2026-09-07"]);
  });
});

describe("monthBuckets", () => {
  it("returns N contiguous months starting from the current month", () => {
    expect(monthBuckets(3, now)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });
});

describe("groupByWeek", () => {
  it("drops items before the first bucket or past the window end", () => {
    const buckets = ["2026-08-10", "2026-08-17"];
    const items = [
      { date: "2026-08-05" }, // before window
      { date: "2026-08-12" }, // bucket 0
      { date: "2026-08-19" }, // bucket 1
      { date: "2026-08-25" }, // past window (window ends 08-24)
    ];
    const grouped = groupByWeek(items, (i) => i.date, buckets);
    expect(grouped[0]).toHaveLength(1);
    expect(grouped[1]).toHaveLength(1);
  });
});

describe("groupByMonth", () => {
  it("groups items by calendar month", () => {
    const buckets = ["2026-08-01", "2026-09-01"];
    const items = [{ date: "2026-08-15" }, { date: "2026-09-02" }, { date: "2026-10-01" }];
    const grouped = groupByMonth(items, (i) => i.date, buckets);
    expect(grouped[0]).toHaveLength(1);
    expect(grouped[1]).toHaveLength(1);
  });
});

describe("computeStageAging", () => {
  it("uses created_at as the start of the first (only) recorded stage when there's no history", () => {
    const projects = [
      { id: "p1", stage: "writing" as const, archived: false, created_at: "2026-08-01T00:00:00Z" },
    ];
    const result = computeStageAging([], projects, new Date("2026-08-25T00:00:00Z"));
    const writing = result.find((r) => r.stage === "writing")!;
    expect(writing.medianDays).toBe(24);
    expect(writing.sampleCount).toBe(1);
  });

  it("computes segment durations from a recorded transition", () => {
    const projects = [
      { id: "p1", stage: "writing" as const, archived: false, created_at: "2026-01-01T00:00:00Z" },
    ];
    const history = [
      {
        project_id: "p1",
        from_stage: "baselines" as const,
        to_stage: "writing" as const,
        changed_at: "2026-08-01T00:00:00Z",
      },
    ];
    const result = computeStageAging(history, projects, new Date("2026-08-25T00:00:00Z"));
    expect(result.find((r) => r.stage === "baselines")!.medianDays).toBe(212); // Jan 1 -> Aug 1
    expect(result.find((r) => r.stage === "writing")!.medianDays).toBe(24); // Aug 1 -> Aug 25
  });

  it("excludes archived projects", () => {
    const projects = [
      { id: "p1", stage: "writing" as const, archived: true, created_at: "2026-01-01T00:00:00Z" },
    ];
    const result = computeStageAging([], projects, now);
    expect(result.every((r) => r.sampleCount === 0)).toBe(true);
  });

  it("computes a median across multiple projects in the same stage", () => {
    const projects = [
      { id: "p1", stage: "idea" as const, archived: false, created_at: "2026-08-15T00:00:00Z" }, // 10 days
      { id: "p2", stage: "idea" as const, archived: false, created_at: "2026-08-05T00:00:00Z" }, // 20 days
      { id: "p3", stage: "idea" as const, archived: false, created_at: "2026-08-21T00:00:00Z" }, // 4 days
    ];
    const result = computeStageAging([], projects, new Date("2026-08-25T00:00:00Z"));
    expect(result.find((r) => r.stage === "idea")!.medianDays).toBe(10);
  });
});

describe("computeProjectMovement", () => {
  it("counts transitions per week", () => {
    const transitions = [
      { changed_at: "2026-08-12T00:00:00Z" },
      { changed_at: "2026-08-13T00:00:00Z" },
      { changed_at: "2026-08-20T00:00:00Z" },
    ];
    const result = computeProjectMovement(transitions, 3, now);
    expect(result).toEqual([
      { weekStart: "2026-08-10", count: 2 },
      { weekStart: "2026-08-17", count: 1 },
      { weekStart: "2026-08-24", count: 0 },
    ]);
  });
});

describe("computeHealthTrend", () => {
  it("assumes healthy before any recorded change, not the project's current health", () => {
    const projects = [
      { id: "p1", health: "stalled" as const, archived: false, created_at: "2026-07-01T00:00:00Z" },
    ];
    const changes = [
      { project_id: "p1", health: "stalled" as const, changed_at: "2026-08-20T00:00:00Z" },
    ];
    const result = computeHealthTrend(changes, projects, 4, now);
    // Week of 2026-08-10 is before the 08-20 change — should still read healthy.
    const earlyWeek = result.find((r) => r.weekStart === "2026-08-10")!;
    expect(earlyWeek.counts.healthy).toBe(1);
    expect(earlyWeek.counts.stalled).toBe(0);
    // The current week (08-24) is after the change.
    const currentWeek = result.find((r) => r.weekStart === "2026-08-24")!;
    expect(currentWeek.counts.stalled).toBe(1);
  });

  it("excludes a project from weeks before it was created", () => {
    const projects = [
      { id: "p1", health: "healthy" as const, archived: false, created_at: "2026-08-22T00:00:00Z" },
    ];
    const result = computeHealthTrend([], projects, 3, now);
    const beforeCreation = result.find((r) => r.weekStart === "2026-08-10")!;
    expect(Object.values(beforeCreation.counts).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("computeDeadlineLoad", () => {
  it("buckets forward-looking deadlines by week and kind", () => {
    const items = [
      { date: "2026-09-01T00:00:00Z", kind: "paper" as const, label: "ICLR abstract" },
      { date: "2026-09-03T00:00:00Z", kind: "paper" as const, label: "ICLR submission" },
      { date: "2026-09-21T00:00:00Z", kind: "grant" as const, label: "Grant review" },
    ];
    const result = computeDeadlineLoad(items, 5, now);
    const week1 = result.find((r) => r.weekStart === "2026-08-31")!;
    expect(week1.total).toBe(2);
    expect(week1.byKind.paper).toBe(2);
    const grantWeek = result.find((r) => r.weekStart === "2026-09-21")!;
    expect(grantWeek.byKind.grant).toBe(1);
  });

  it("returns empty buckets, not dropped weeks, when nothing is due", () => {
    const result = computeDeadlineLoad([], 4, now);
    expect(result).toHaveLength(4);
    expect(result.every((r) => r.total === 0)).toBe(true);
  });
});

describe("computeSubmissionLoad", () => {
  it("counts publications with a submission deadline per month, ignoring publications without one", () => {
    const pubs = [
      { submission_deadline: "2026-09-04" },
      { submission_deadline: "2026-09-20" },
      { submission_deadline: "2026-10-01" },
      { submission_deadline: null },
    ];
    const result = computeSubmissionLoad(pubs, 3, now);
    expect(result.find((r) => r.monthStart === "2026-09-01")!.count).toBe(2);
    expect(result.find((r) => r.monthStart === "2026-10-01")!.count).toBe(1);
  });
});

describe("computeActivityByWeek", () => {
  it("keeps event types separate rather than combining into one score", () => {
    const events = [
      { date: "2026-08-12T00:00:00Z", type: "update" as const },
      { date: "2026-08-13T00:00:00Z", type: "update" as const },
      { date: "2026-08-13T00:00:00Z", type: "meeting" as const },
    ];
    const result = computeActivityByWeek(events, 3, now);
    const week = result.find((r) => r.weekStart === "2026-08-10")!;
    expect(week.counts.update).toBe(2);
    expect(week.counts.meeting).toBe(1);
    expect(week.counts.decision).toBe(0);
  });
});
