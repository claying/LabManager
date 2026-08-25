import { describe, expect, it } from "vitest";
import { calculatePublicationDeadlineSignal, calculateProjectAttention } from "./attention";

const now = new Date("2026-06-15T00:00:00Z");

function baseProject(overrides: Partial<Parameters<typeof calculateProjectAttention>[0]> = {}) {
  return {
    health: "healthy" as const,
    archived: false,
    last_update_at: now.toISOString(),
    next_milestone: "Ship v1",
    next_milestone_date: null,
    ...overrides,
  };
}

describe("calculateProjectAttention", () => {
  it("flags nothing for a recently-updated, on-track project", () => {
    const result = calculateProjectAttention(baseProject(), now);
    expect(result.needsAttention).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it("emits NO_UPDATE_14_DAYS at exactly 14 days and flags needsAttention", () => {
    const result = calculateProjectAttention(
      baseProject({ last_update_at: "2026-06-01T00:00:00Z" }),
      now,
    );
    expect(result.signals.map((s) => s.type)).toContain("NO_UPDATE_14_DAYS");
    expect(result.needsAttention).toBe(true);
  });

  it("escalates to NO_UPDATE_30_DAYS (critical) instead of the 14-day warning", () => {
    const result = calculateProjectAttention(
      baseProject({ last_update_at: "2026-05-10T00:00:00Z" }),
      now,
    );
    const types = result.signals.map((s) => s.type);
    expect(types).toContain("NO_UPDATE_30_DAYS");
    expect(types).not.toContain("NO_UPDATE_14_DAYS");
    expect(result.signals.find((s) => s.type === "NO_UPDATE_30_DAYS")?.severity).toBe("critical");
  });

  it("flags MILESTONE_OVERDUE and needsAttention when the milestone date has passed", () => {
    const result = calculateProjectAttention(
      baseProject({ next_milestone_date: "2026-06-11T00:00:00Z" }),
      now,
    );
    const signal = result.signals.find((s) => s.type === "MILESTONE_OVERDUE");
    expect(signal).toBeDefined();
    expect(signal?.message).toContain("overdue by 4 days");
    expect(result.needsAttention).toBe(true);
  });

  it("flags MILESTONE_DUE_SOON (warning, not needsAttention on its own) inside the 7-day window", () => {
    const result = calculateProjectAttention(
      baseProject({ next_milestone_date: "2026-06-20T00:00:00Z" }),
      now,
    );
    const signal = result.signals.find((s) => s.type === "MILESTONE_DUE_SOON");
    expect(signal?.severity).toBe("warning");
    expect(result.needsAttention).toBe(false);
  });

  it("always needs attention when health is at_risk or stalled, even with no other signals", () => {
    expect(calculateProjectAttention(baseProject({ health: "at_risk" }), now).needsAttention).toBe(
      true,
    );
    expect(calculateProjectAttention(baseProject({ health: "stalled" }), now).needsAttention).toBe(
      true,
    );
  });

  it("never flags archived projects regardless of staleness", () => {
    const result = calculateProjectAttention(
      baseProject({ archived: true, health: "stalled", last_update_at: "2025-01-01T00:00:00Z" }),
      now,
    );
    expect(result.needsAttention).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it("matches the SPEC.md worked example: 18 days stale + 4 days overdue", () => {
    const result = calculateProjectAttention(
      baseProject({
        last_update_at: "2026-05-28T00:00:00Z",
        next_milestone: "Ablation study",
        next_milestone_date: "2026-06-11T00:00:00Z",
      }),
      now,
    );
    expect(result.needsAttention).toBe(true);
    expect(result.signals.find((s) => s.type === "NO_UPDATE_14_DAYS")?.message).toBe(
      "No update for 18 days",
    );
    expect(result.signals.find((s) => s.type === "MILESTONE_OVERDUE")?.message).toContain(
      "overdue by 4 days",
    );
  });
});

describe("calculatePublicationDeadlineSignal", () => {
  it("returns null when there is no deadline", () => {
    expect(
      calculatePublicationDeadlineSignal({ status: "drafting", submission_deadline: null }, now),
    ).toBeNull();
  });

  it("returns null once the publication has moved past active drafting (e.g. submitted)", () => {
    expect(
      calculatePublicationDeadlineSignal(
        { status: "submitted", submission_deadline: "2026-06-20T00:00:00Z" },
        now,
      ),
    ).toBeNull();
  });

  it("returns null when the deadline is more than 60 days away", () => {
    expect(
      calculatePublicationDeadlineSignal(
        { status: "drafting", submission_deadline: "2026-09-01T00:00:00Z" },
        now,
      ),
    ).toBeNull();
  });

  it("flags critical severity inside 7 days", () => {
    const signal = calculatePublicationDeadlineSignal(
      { status: "drafting", submission_deadline: "2026-06-18T00:00:00Z" },
      now,
    );
    expect(signal?.severity).toBe("critical");
  });

  it("flags warning severity between 7 and 60 days", () => {
    const signal = calculatePublicationDeadlineSignal(
      { status: "drafting", submission_deadline: "2026-07-01T00:00:00Z" },
      now,
    );
    expect(signal?.severity).toBe("warning");
  });
});
