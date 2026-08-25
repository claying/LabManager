import { describe, expect, it } from "vitest";
import { computeWeeklyReview, type WeeklyReviewInput } from "./weeklyReview";

function baseInput(overrides: Partial<WeeklyReviewInput> = {}): WeeklyReviewInput {
  return {
    projectsAdvancedCount: 0,
    milestonesCompletedCount: 0,
    publicationStageChanges: [],
    needsAttention: [],
    decisionsResolved: [],
    people: [],
    nextWeek: [],
    ...overrides,
  };
}

describe("computeWeeklyReview", () => {
  it("omits zero-count progress lines", () => {
    const result = computeWeeklyReview(baseInput());
    expect(result.progress).toHaveLength(0);
  });

  it("formats progress counts, including grouped publication stage changes", () => {
    const result = computeWeeklyReview(
      baseInput({
        projectsAdvancedCount: 3,
        milestonesCompletedCount: 2,
        publicationStageChanges: [{ statusLabel: "Writing", count: 1 }],
      }),
    );
    expect(result.progress).toEqual([
      { label: "projects advanced", count: 3 },
      { label: "milestones completed", count: 2 },
      { label: "paper moved to Writing", count: 1 },
    ]);
  });

  it("pluralizes multi-paper stage change lines", () => {
    const result = computeWeeklyReview(
      baseInput({ publicationStageChanges: [{ statusLabel: "Submitted", count: 2 }] }),
    );
    expect(result.progress).toEqual([{ label: "papers moved to Submitted", count: 2 }]);
  });

  it("prefers the decision text over the request title when resolved", () => {
    const result = computeWeeklyReview(
      baseInput({
        decisionsResolved: [
          { title: "Which metric?", decision: "Use recurrent metric" },
          { title: "Target venue", decision: null },
        ],
      }),
    );
    expect(result.decisions).toEqual(["Use recurrent metric", "Target venue"]);
  });

  it("shows one detail per person, prioritizing blocked over no-1:1 over update count", () => {
    const result = computeWeeklyReview(
      baseInput({
        people: [
          { name: "Alice", blocked: false, noOneOnOneDays: null, updateCount: 2 },
          { name: "Bob", blocked: true, noOneOnOneDays: 20, updateCount: 5 },
          { name: "Carol", blocked: false, noOneOnOneDays: 12, updateCount: 0 },
          { name: "Dave", blocked: false, noOneOnOneDays: null, updateCount: 0 },
        ],
      }),
    );
    expect(result.people).toEqual([
      { name: "Alice", detail: "2 updates" },
      { name: "Bob", detail: "blocked" },
      { name: "Carol", detail: "no 1:1 in 12d" },
    ]);
  });

  it("is a pure function of its input — same input always yields the same output", () => {
    const input = baseInput({
      projectsAdvancedCount: 1,
      decisionsResolved: [{ title: "X", decision: "Y" }],
    });
    expect(computeWeeklyReview(input)).toEqual(computeWeeklyReview(input));
  });
});
