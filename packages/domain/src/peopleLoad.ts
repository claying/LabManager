/**
 * Deliberately NOT a productivity score. This only counts how many active,
 * non-archived projects a person currently participates in and flags anyone
 * above a plain, explainable threshold so a PI can sanity-check load —
 * nothing here judges quality or output.
 */
export const DEFAULT_OVERLOAD_THRESHOLD = 4;

export interface PersonLoadInput {
  personId: string;
}

export interface ProjectMembershipInput {
  personId: string;
  projectArchived: boolean;
}

export interface PersonLoad {
  personId: string;
  activeProjectCount: number;
  isOverloaded: boolean;
}

export function calculatePeopleLoad(
  people: PersonLoadInput[],
  memberships: ProjectMembershipInput[],
  overloadThreshold: number = DEFAULT_OVERLOAD_THRESHOLD,
): PersonLoad[] {
  const counts = new Map<string, number>();
  for (const m of memberships) {
    if (m.projectArchived) continue;
    counts.set(m.personId, (counts.get(m.personId) ?? 0) + 1);
  }

  return people.map((p) => {
    const activeProjectCount = counts.get(p.personId) ?? 0;
    return {
      personId: p.personId,
      activeProjectCount,
      isOverloaded: activeProjectCount > overloadThreshold,
    };
  });
}
