import { describe, expect, it } from "vitest";
import {
  generatePlanDates,
  calculateSubmissionHealth,
  calculateReadinessPercent,
} from "./submissionPlan";

describe("generatePlanDates", () => {
  it("generates the default template as absolute dates relative to the deadline", () => {
    const dates = generatePlanDates(new Date("2026-09-09T00:00:00Z"));
    expect(dates).toHaveLength(6);
    expect(dates[0]).toEqual({
      label: "Main experiments complete",
      offsetDays: -35,
      dueDate: "2026-08-05",
    });
    expect(dates[5]).toEqual({ label: "Submission", offsetDays: 0, dueDate: "2026-09-09" });
  });

  it("accepts a custom template", () => {
    const dates = generatePlanDates(new Date("2026-09-09T00:00:00Z"), [
      { label: "Draft", offsetDays: -10 },
    ]);
    expect(dates).toEqual([{ label: "Draft", offsetDays: -10, dueDate: "2026-08-30" }]);
  });
});

describe("calculateSubmissionHealth", () => {
  const deadline = "2026-09-09T00:00:00Z";

  it("is on_track when every item is done or comfortably ahead of schedule", () => {
    const items = [
      { label: "Main experiments complete", offsetDays: -35, status: "done" as const },
    ];
    const result = calculateSubmissionHealth(items, deadline, new Date("2026-08-01T00:00:00Z"));
    expect(result.status).toBe("on_track");
  });

  it("flags attention when the next item is due within 2 days", () => {
    const items = [{ label: "First draft", offsetDays: -24, status: "pending" as const }];
    // deadline - 24 = Aug 16; "now" 2 days before that = Aug 14
    const result = calculateSubmissionHealth(items, deadline, new Date("2026-08-14T00:00:00Z"));
    expect(result.status).toBe("attention");
    expect(result.reason).toContain("First draft");
  });

  it("flags attention for a mildly overdue item, at_risk for a badly overdue one", () => {
    const items = [{ label: "First draft", offsetDays: -24, status: "pending" as const }]; // due Aug 16
    const mild = calculateSubmissionHealth(items, deadline, new Date("2026-08-18T00:00:00Z")); // 2d overdue
    expect(mild.status).toBe("attention");
    const bad = calculateSubmissionHealth(items, deadline, new Date("2026-08-25T00:00:00Z")); // 9d overdue
    expect(bad.status).toBe("at_risk");
    expect(bad.reason).toBe("First draft 9d overdue");
  });

  it("is late once the deadline has passed without completion", () => {
    const items = [{ label: "Submission", offsetDays: 0, status: "pending" as const }];
    const result = calculateSubmissionHealth(items, deadline, new Date("2026-09-12T00:00:00Z"));
    expect(result.status).toBe("late");
    expect(result.reason).toContain("3d ago");
  });

  it("is on_track (submitted) when the deadline has passed but everything is done", () => {
    const items = [{ label: "Submission", offsetDays: 0, status: "done" as const }];
    const result = calculateSubmissionHealth(items, deadline, new Date("2026-09-12T00:00:00Z"));
    expect(result.status).toBe("on_track");
    expect(result.reason).toBe("Submitted");
  });

  it("explains the reason in plain English, not a score", () => {
    const items = [{ label: "First draft", offsetDays: -24, status: "pending" as const }];
    const result = calculateSubmissionHealth(items, deadline, new Date("2026-08-25T00:00:00Z"));
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
  });
});

describe("calculateReadinessPercent", () => {
  it("counts done as full credit and in_progress as half", () => {
    const items = [
      { status: "done" as const },
      { status: "in_progress" as const },
      { status: "not_started" as const },
      { status: "not_started" as const },
    ];
    expect(calculateReadinessPercent(items)).toBe(38); // (1 + 0.5) / 4 = 37.5 -> rounds to 38
  });

  it("excludes not_applicable items from the denominator", () => {
    const items = [{ status: "done" as const }, { status: "not_applicable" as const }];
    expect(calculateReadinessPercent(items)).toBe(100);
  });

  it("returns 0 when every item is not_applicable", () => {
    expect(calculateReadinessPercent([{ status: "not_applicable" }])).toBe(0);
  });
});
