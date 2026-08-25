import { describe, expect, it } from "vitest";
import { calculateUpcoming } from "./upcoming";

const now = new Date("2026-06-15T00:00:00Z");

describe("calculateUpcoming", () => {
  it("merges milestones, publication and grant deadlines, and action items sorted soonest-first", () => {
    const items = calculateUpcoming(
      {
        milestones: [
          {
            id: "m1",
            title: "Ablation done",
            due_date: "2026-06-25T00:00:00Z",
            status: "in_progress",
            project_id: "p1",
          },
        ],
        publications: [
          {
            id: "pub1",
            title: "GraphFM paper",
            submission_deadline: "2026-06-18T00:00:00Z",
            status: "drafting",
            project_id: "p1",
          },
        ],
        grants: [
          { id: "g1", title: "NSF renewal", deadline: "2026-06-30T00:00:00Z", status: "preparing" },
        ],
        actionItems: [
          {
            id: "a1",
            title: "Send draft to advisor",
            due_date: "2026-06-16T00:00:00Z",
            status: "open",
            project_id: null,
          },
        ],
      },
      now,
    );

    expect(items.map((i) => i.id)).toEqual(["a1", "pub1", "m1", "g1"]);
    expect(items.every((i, idx) => idx === 0 || i.daysAway >= items[idx - 1]!.daysAway)).toBe(true);
  });

  it("excludes items without a date and items in terminal statuses", () => {
    const items = calculateUpcoming(
      {
        milestones: [
          { id: "m1", title: "No date", due_date: null, status: "planned", project_id: "p1" },
          {
            id: "m2",
            title: "Done already",
            due_date: "2026-06-20T00:00:00Z",
            status: "completed",
            project_id: "p1",
          },
        ],
        publications: [],
        grants: [],
        actionItems: [],
      },
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("excludes items outside the requested window", () => {
    const items = calculateUpcoming(
      {
        milestones: [],
        publications: [],
        grants: [
          {
            id: "g1",
            title: "Far future grant",
            deadline: "2027-01-01T00:00:00Z",
            status: "preparing",
          },
        ],
        actionItems: [],
      },
      now,
      60,
    );
    expect(items).toHaveLength(0);
  });
});
