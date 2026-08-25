import type {
  DecisionPriority,
  InboxGroup,
  InboxItem,
  InboxSignal,
  ProjectHealth,
} from "@pi-os/types";
import { daysSince, daysUntil } from "./date";

// Tuned tighter than the Dashboard's 60-day "Upcoming" window (packages/domain/upcoming.ts) —
// the Inbox is "what needs you now", not a general lookahead.
const STALE_DAYS = 14;
const MILESTONE_DUE_SOON_DAYS = 7;
const DEADLINE_DUE_SOON_DAYS = 14;
const NO_1ON1_DAYS = 14;

export interface InboxProjectInput {
  id: string;
  title: string;
  short_name: string | null;
  health: ProjectHealth;
  archived: boolean;
  last_update_at: string | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
  /** Blockers text from the most recent weekly update, if any. */
  latestUpdateBlockers: string | null;
  leadName: string | null;
}

export interface InboxMilestoneInput {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  due_date: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
}

export interface InboxPublicationInput {
  id: string;
  title: string;
  status: string;
  submission_deadline: string | null;
}

export interface InboxGrantInput {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

export interface InboxDecisionInput {
  id: string;
  title: string;
  project_id: string | null;
  project_title: string | null;
  person_name: string | null;
  priority: DecisionPriority;
  status: "open" | "resolved" | "deferred";
}

export interface InboxPersonInput {
  id: string;
  name: string;
  status: "active" | "inactive" | "alumni";
  /** Most recent one_on_one meeting date this person attended, if any. */
  lastOneOnOneAt: string | null;
}

export interface InboxActionItemInput {
  id: string;
  title: string;
  project_title: string | null;
  assignee_name: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
}

export interface InboxComputeInput {
  projects: InboxProjectInput[];
  milestones: InboxMilestoneInput[];
  publications: InboxPublicationInput[];
  grants: InboxGrantInput[];
  decisions: InboxDecisionInput[];
  people: InboxPersonInput[];
  actionItems: InboxActionItemInput[];
}

const DONE_PUBLICATION_STATUSES = ["submitted", "rebuttal", "accepted", "published", "withdrawn"];
const DONE_GRANT_STATUSES = ["awarded", "rejected", "active", "completed"];

/**
 * Computes the PI's Inbox from live local data (SPEC_followup section 8) —
 * no rows are stored; every call recomputes from current state. Signals
 * about the same project are merged into a single row (section 8's "GraphFM
 * 18d stale · milestone overdue · blocked" example) rather than one row per
 * signal, keyed by a stable string (section 36) so snooze/dismiss state
 * survives across recomputes.
 */
export function computeInboxItems(input: InboxComputeInput, now: Date = new Date()): InboxItem[] {
  const items: InboxItem[] = [];

  const milestonesByProject = new Map<string, InboxMilestoneInput[]>();
  for (const m of input.milestones) {
    if (m.status !== "planned" && m.status !== "in_progress") continue;
    const list = milestonesByProject.get(m.project_id) ?? [];
    list.push(m);
    milestonesByProject.set(m.project_id, list);
  }

  for (const project of input.projects) {
    if (project.archived) continue;
    const signals: InboxSignal[] = [];
    let group: InboxGroup | null = null;

    const hasBlocker = Boolean(project.latestUpdateBlockers?.trim());
    if (hasBlocker) {
      const who = project.leadName ? `${project.leadName} / ` : "";
      signals.push({ type: "PROJECT_BLOCKED", label: `${who}blocked` });
      group = "blocked";
    }

    if (project.health === "stalled" || project.health === "at_risk") {
      signals.push({
        type: "PROJECT_STALLED",
        label: project.health === "stalled" ? "stalled" : "at risk",
      });
      group = group ?? "blocked";
    }

    if (project.last_update_at) {
      const days = daysSince(new Date(project.last_update_at), now);
      if (days >= STALE_DAYS) {
        signals.push({ type: "PROJECT_STALE", label: `${days}d stale` });
        group = group ?? "stale";
      }
    }

    const openMilestones = milestonesByProject.get(project.id) ?? [];
    for (const m of openMilestones) {
      if (!m.due_date) continue;
      const until = daysUntil(new Date(m.due_date), now);
      if (until < 0) {
        signals.push({ type: "MILESTONE_OVERDUE", label: `milestone ${Math.abs(until)}d overdue` });
        group = group ?? "stale";
      } else if (until <= MILESTONE_DUE_SOON_DAYS) {
        signals.push({ type: "MILESTONE_DUE_SOON", label: `milestone due in ${until}d` });
        group = group ?? "due_soon";
      }
    }

    if (signals.length === 0 || !group) continue;

    items.push({
      key: `project:${project.id}:cluster`,
      group,
      title: project.short_name ?? project.title,
      context: signals.map((s) => s.label).join(" · "),
      signals,
      severity:
        group === "blocked" || signals.some((s) => s.type === "MILESTONE_OVERDUE")
          ? "critical"
          : "warning",
      href: `/projects/${project.id}`,
      entityType: "project",
      entityId: project.id,
    });
  }

  for (const decision of input.decisions) {
    if (decision.status !== "open") continue;
    items.push({
      key: `decision:${decision.id}:open`,
      group: "decide",
      title: decision.project_title ?? decision.person_name ?? "Decision",
      context: decision.title,
      signals: [
        { type: "DECISION_OPEN", label: decision.priority === "urgent" ? "urgent" : "decision" },
      ],
      severity: decision.priority === "urgent" ? "critical" : "warning",
      href: decision.project_id ? `/projects/${decision.project_id}` : "/inbox",
      entityType: "decision",
      entityId: decision.id,
    });
  }

  for (const pub of input.publications) {
    if (!pub.submission_deadline || DONE_PUBLICATION_STATUSES.includes(pub.status)) continue;
    const until = daysUntil(new Date(pub.submission_deadline), now);
    if (until > DEADLINE_DUE_SOON_DAYS) continue;
    items.push({
      key: `publication:${pub.id}:deadline`,
      group: "due_soon",
      title: pub.title,
      context: until < 0 ? `${Math.abs(until)}d overdue` : `due in ${until}d`,
      signals: [{ type: "PUBLICATION_DEADLINE_SOON", label: "deadline" }],
      severity: until < 0 ? "critical" : "warning",
      href: "/publications",
      entityType: "publication",
      entityId: pub.id,
    });
  }

  for (const grant of input.grants) {
    if (!grant.deadline || DONE_GRANT_STATUSES.includes(grant.status)) continue;
    const until = daysUntil(new Date(grant.deadline), now);
    if (until > DEADLINE_DUE_SOON_DAYS) continue;
    items.push({
      key: `grant:${grant.id}:deadline`,
      group: "due_soon",
      title: grant.title,
      context: until < 0 ? `${Math.abs(until)}d overdue` : `due in ${until}d`,
      signals: [{ type: "GRANT_DEADLINE_SOON", label: "deadline" }],
      severity: until < 0 ? "critical" : "warning",
      href: "/grants",
      entityType: "grant",
      entityId: grant.id,
    });
  }

  for (const person of input.people) {
    if (person.status !== "active") continue;
    if (!person.lastOneOnOneAt) continue;
    const days = daysSince(new Date(person.lastOneOnOneAt), now);
    if (days < NO_1ON1_DAYS) continue;
    items.push({
      key: `person:${person.id}:no_1on1`,
      group: "follow_up",
      title: person.name,
      context: `${days}d since 1:1`,
      signals: [{ type: "PERSON_NOT_SEEN", label: `${days}d` }],
      severity: "warning",
      href: `/people/${person.id}`,
      entityType: "person",
      entityId: person.id,
    });
  }

  for (const item of input.actionItems) {
    if (item.status !== "open" && item.status !== "in_progress") continue;
    if (!item.due_date) continue;
    const until = daysUntil(new Date(item.due_date), now);
    if (until >= 0) continue;
    items.push({
      key: `action_item:${item.id}:overdue`,
      group: "follow_up",
      title: item.assignee_name ?? "Unassigned",
      context: `${item.title} · ${Math.abs(until)}d overdue`,
      signals: [{ type: "ACTION_ITEM_OVERDUE", label: `${Math.abs(until)}d overdue` }],
      severity: "critical",
      href: item.project_title ? "/inbox" : "/inbox",
      entityType: "action_item",
      entityId: item.id,
    });
  }

  return items;
}

const GROUP_ORDER: InboxGroup[] = ["decide", "blocked", "stale", "due_soon", "follow_up"];

export function sortInboxItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    const groupDiff = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (groupDiff !== 0) return groupDiff;
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
