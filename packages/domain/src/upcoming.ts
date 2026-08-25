import { daysUntil } from "./date";

export type UpcomingItemKind =
  "milestone" | "publication_deadline" | "grant_deadline" | "action_item";

export interface UpcomingItem {
  kind: UpcomingItemKind;
  id: string;
  title: string;
  date: string;
  daysAway: number;
  projectId?: string | null;
  projectTitle?: string | null;
}

export interface UpcomingSourceData {
  milestones: {
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    project_id: string;
    projectTitle?: string;
  }[];
  publications: {
    id: string;
    title: string;
    submission_deadline: string | null;
    status: string;
    project_id: string | null;
    projectTitle?: string | null;
  }[];
  grants: { id: string; title: string; deadline: string | null; status: string }[];
  actionItems: {
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    project_id: string | null;
    projectTitle?: string | null;
  }[];
}

const OPEN_MILESTONE_STATUSES = new Set(["planned", "in_progress"]);
const OPEN_ACTION_STATUSES = new Set(["open", "in_progress"]);
const OPEN_PUBLICATION_STATUSES = new Set(["idea", "experiments", "drafting", "internal_review"]);
const OPEN_GRANT_STATUSES = new Set(["idea", "preparing"]);

/**
 * Chronological list of everything due within `windowDays` (default 60),
 * combining milestones, publication deadlines, grant deadlines, and action
 * items, sorted soonest-first.
 */
export function calculateUpcoming(
  data: UpcomingSourceData,
  now: Date = new Date(),
  windowDays = 60,
): UpcomingItem[] {
  const items: UpcomingItem[] = [];

  for (const m of data.milestones) {
    if (!m.due_date || !OPEN_MILESTONE_STATUSES.has(m.status)) continue;
    items.push({
      kind: "milestone",
      id: m.id,
      title: m.title,
      date: m.due_date,
      daysAway: daysUntil(new Date(m.due_date), now),
      projectId: m.project_id,
      projectTitle: m.projectTitle ?? null,
    });
  }

  for (const p of data.publications) {
    if (!p.submission_deadline || !OPEN_PUBLICATION_STATUSES.has(p.status)) continue;
    items.push({
      kind: "publication_deadline",
      id: p.id,
      title: p.title,
      date: p.submission_deadline,
      daysAway: daysUntil(new Date(p.submission_deadline), now),
      projectId: p.project_id,
      projectTitle: p.projectTitle ?? null,
    });
  }

  for (const g of data.grants) {
    if (!g.deadline || !OPEN_GRANT_STATUSES.has(g.status)) continue;
    items.push({
      kind: "grant_deadline",
      id: g.id,
      title: g.title,
      date: g.deadline,
      daysAway: daysUntil(new Date(g.deadline), now),
    });
  }

  for (const a of data.actionItems) {
    if (!a.due_date || !OPEN_ACTION_STATUSES.has(a.status)) continue;
    items.push({
      kind: "action_item",
      id: a.id,
      title: a.title,
      date: a.due_date,
      daysAway: daysUntil(new Date(a.due_date), now),
      projectId: a.project_id,
      projectTitle: a.projectTitle ?? null,
    });
  }

  return items
    .filter((item) => item.daysAway <= windowDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}
