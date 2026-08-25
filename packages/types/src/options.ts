// Central source of truth for enum display order + labels, so every select,
// filter, and badge stays in sync with the SQLite CHECK constraints in
// apps/desktop/src-tauri/migrations.

export const PERSON_ROLES = [
  "PI",
  "Postdoc",
  "PhD",
  "Master",
  "RA",
  "Research Assistant",
  "Intern",
  "Collaborator",
  "Alumni",
  "Other",
] as const;

export const PERSON_STATUSES = ["active", "inactive", "alumni"] as const;

export const PROJECT_STAGES = [
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
  "paused",
] as const;

export const PROJECT_STAGE_LABELS: Record<(typeof PROJECT_STAGES)[number], string> = {
  idea: "Idea",
  prototype: "Prototype",
  baselines: "Baselines",
  main_experiments: "Main Experiments",
  ablation: "Ablation",
  writing: "Writing",
  submitted: "Submitted",
  rebuttal: "Rebuttal",
  accepted: "Accepted",
  published: "Published",
  paused: "Paused",
};

// Stages shown on the pipeline board (paused projects are tracked but not
// part of the linear pipeline visualization).
export const PIPELINE_STAGES = PROJECT_STAGES.filter((s) => s !== "paused");

export const PROJECT_HEALTHS = ["healthy", "attention", "at_risk", "stalled"] as const;

export const PROJECT_HEALTH_LABELS: Record<(typeof PROJECT_HEALTHS)[number], string> = {
  healthy: "Healthy",
  attention: "Needs Attention",
  at_risk: "At Risk",
  stalled: "Stalled",
};

export const PROJECT_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const PROJECT_MEMBER_ROLES = ["lead", "core_member", "collaborator", "advisor"] as const;

export const MILESTONE_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;

export const MEETING_TYPES = ["project", "one_on_one", "lab", "collaboration", "other"] as const;

export const MEETING_TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  project: "Project",
  one_on_one: "1:1",
  lab: "Lab Meeting",
  collaboration: "Collaboration",
  other: "Other",
};

export const ACTION_ITEM_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;

export const ACTION_ITEM_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const PUBLICATION_STATUSES = [
  "idea",
  "experiments",
  "drafting",
  "internal_review",
  "submitted",
  "rebuttal",
  "accepted",
  "published",
  "withdrawn",
] as const;

export const PUBLICATION_STATUS_LABELS: Record<(typeof PUBLICATION_STATUSES)[number], string> = {
  idea: "Idea",
  experiments: "Experiments",
  drafting: "Drafting",
  internal_review: "Internal Review",
  submitted: "Submitted",
  rebuttal: "Rebuttal",
  accepted: "Accepted",
  published: "Published",
  withdrawn: "Withdrawn",
};

export const PUBLICATION_PIPELINE_STATUSES = PUBLICATION_STATUSES.filter((s) => s !== "withdrawn");

export const GRANT_STATUSES = [
  "idea",
  "preparing",
  "submitted",
  "awarded",
  "rejected",
  "active",
  "completed",
] as const;

export const GRANT_STATUS_LABELS: Record<(typeof GRANT_STATUSES)[number], string> = {
  idea: "Idea",
  preparing: "Preparing",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  active: "Active",
  completed: "Completed",
};

export const GRANT_MEMBER_ROLES = ["pi", "co_pi", "senior_personnel", "contributor"] as const;

export const DECISION_STATUSES = ["open", "resolved", "deferred"] as const;

export const DECISION_PRIORITIES = ["normal", "important", "urgent"] as const;

export const IDEA_STATES = ["inbox", "promising", "incubating", "converted", "archived"] as const;

export const IDEA_STATE_LABELS: Record<(typeof IDEA_STATES)[number], string> = {
  inbox: "Inbox",
  promising: "Promising",
  incubating: "Incubating",
  converted: "Converted",
  archived: "Archived",
};

export const INBOX_GROUPS = ["decide", "blocked", "stale", "due_soon", "follow_up"] as const;

export const INBOX_GROUP_LABELS: Record<(typeof INBOX_GROUPS)[number], string> = {
  decide: "Decide",
  blocked: "Blocked",
  stale: "Stale",
  due_soon: "Due Soon",
  follow_up: "Follow Up",
};

// ---- Tier 2: research questions, hypotheses, evidence ----------------------

export const RESEARCH_QUESTION_STATUSES = ["open", "investigating", "answered", "parked"] as const;

export const RESEARCH_QUESTION_STATUS_LABELS: Record<
  (typeof RESEARCH_QUESTION_STATUSES)[number],
  string
> = {
  open: "Open",
  investigating: "Investigating",
  answered: "Answered",
  parked: "Parked",
};

export const HYPOTHESIS_STATUSES = [
  "untested",
  "testing",
  "supported",
  "mixed",
  "not_supported",
] as const;

export const HYPOTHESIS_STATUS_LABELS: Record<(typeof HYPOTHESIS_STATUSES)[number], string> = {
  untested: "Untested",
  testing: "Testing",
  supported: "Supported",
  mixed: "Mixed",
  not_supported: "Not supported",
};

export const HYPOTHESIS_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const EVIDENCE_TYPES = [
  "experiment",
  "analysis",
  "paper",
  "observation",
  "meeting",
  "other",
] as const;

export const EVIDENCE_TYPE_LABELS: Record<(typeof EVIDENCE_TYPES)[number], string> = {
  experiment: "Experiment",
  analysis: "Analysis",
  paper: "Paper",
  observation: "Observation",
  meeting: "Meeting",
  other: "Other",
};

export const EVIDENCE_DIRECTIONS = ["supports", "contradicts", "mixed", "neutral"] as const;

export const EVIDENCE_DIRECTION_LABELS: Record<(typeof EVIDENCE_DIRECTIONS)[number], string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  mixed: "Mixed",
  neutral: "Neutral",
};

// ---- Tier 2: venues, submission planning, paper readiness -------------------

export const VENUE_CATEGORIES = ["conference", "journal", "workshop", "grant", "other"] as const;

export const VENUE_CATEGORY_LABELS: Record<(typeof VENUE_CATEGORIES)[number], string> = {
  conference: "Conference",
  journal: "Journal",
  workshop: "Workshop",
  grant: "Grant",
  other: "Other",
};

export const SUBMISSION_PLAN_ITEM_STATUSES = ["pending", "done"] as const;

export const PAPER_READINESS_STATUSES = [
  "not_started",
  "in_progress",
  "done",
  "not_applicable",
] as const;

export const PAPER_READINESS_STATUS_LABELS: Record<
  (typeof PAPER_READINESS_STATUSES)[number],
  string
> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
  not_applicable: "N/A",
};

export const DEFAULT_PAPER_READINESS_ITEMS = [
  "Main result",
  "Baselines",
  "Ablations",
  "Figures",
  "Draft",
  "Internal review",
  "Supplement",
  "Code",
] as const;

/** Relative to a venue cycle's submission_deadline; negative = days before. */
export const DEFAULT_SUBMISSION_PLAN_TEMPLATE: { label: string; offsetDays: number }[] = [
  { label: "Main experiments complete", offsetDays: -35 },
  { label: "First draft", offsetDays: -24 },
  { label: "Internal review", offsetDays: -16 },
  { label: "Final experiments", offsetDays: -9 },
  { label: "Paper freeze", offsetDays: -4 },
  { label: "Submission", offsetDays: 0 },
];

export const SUBMISSION_HEALTH_STATUSES = ["on_track", "attention", "at_risk", "late"] as const;

export const SUBMISSION_HEALTH_LABELS: Record<(typeof SUBMISSION_HEALTH_STATUSES)[number], string> =
  {
    on_track: "On track",
    attention: "Attention",
    at_risk: "At risk",
    late: "Late",
  };
