import { describe, expect, it } from "vitest";
import { calculatePeopleLoad } from "./peopleLoad";

describe("calculatePeopleLoad", () => {
  it("counts only active-project memberships per person", () => {
    const load = calculatePeopleLoad(
      [{ personId: "alice" }, { personId: "bob" }],
      [
        { personId: "alice", projectArchived: false },
        { personId: "alice", projectArchived: false },
        { personId: "alice", projectArchived: true },
        { personId: "bob", projectArchived: true },
      ],
    );
    expect(load.find((l) => l.personId === "alice")?.activeProjectCount).toBe(2);
    expect(load.find((l) => l.personId === "bob")?.activeProjectCount).toBe(0);
  });

  it("flags overload strictly above the threshold, not at it", () => {
    const memberships = Array.from({ length: 4 }, () => ({
      personId: "alice",
      projectArchived: false,
    }));
    const atThreshold = calculatePeopleLoad([{ personId: "alice" }], memberships, 4);
    expect(atThreshold[0]?.isOverloaded).toBe(false);

    const overThreshold = calculatePeopleLoad(
      [{ personId: "alice" }],
      [...memberships, { personId: "alice", projectArchived: false }],
      4,
    );
    expect(overThreshold[0]?.isOverloaded).toBe(true);
  });
});
