import { describe, expect, it } from "vitest";
import { calculatePipelineCounts } from "./pipeline";

describe("calculatePipelineCounts", () => {
  it("counts non-archived projects per stage and excludes archived ones", () => {
    const projects = [
      { stage: "idea" as const, archived: false },
      { stage: "idea" as const, archived: false },
      { stage: "writing" as const, archived: false },
      { stage: "writing" as const, archived: true },
    ];
    const counts = calculatePipelineCounts(projects);
    expect(counts.find((c) => c.stage === "idea")?.count).toBe(2);
    expect(counts.find((c) => c.stage === "writing")?.count).toBe(1);
    expect(counts.find((c) => c.stage === "prototype")?.count).toBe(0);
  });

  it("excludes paused projects from the pipeline view", () => {
    const counts = calculatePipelineCounts([{ stage: "paused" as const, archived: false }]);
    expect(counts.find((c) => (c.stage as string) === "paused")).toBeUndefined();
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(0);
  });

  it("returns every pipeline stage in display order, even with zero projects", () => {
    const counts = calculatePipelineCounts([]);
    expect(counts.map((c) => c.stage)).toEqual([
      "idea",
      "prototype",
      "baselines",
      "main_experiments",
      "ablation",
      "writing",
      "submitted",
      "rebuttal",
      "accepted",
      "published",
    ]);
  });
});
