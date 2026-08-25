// Hand-authored entity types for the local SQLite schema
// (apps/desktop/src-tauri/migrations). There is no code-generation step here
// — unlike the old Supabase-backed version, these are the single source of
// truth alongside the migration SQL, which they must be kept in sync with by
// hand. Literal unions are derived from options.ts so labels/options/types
// never drift apart.

import type {
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  DECISION_PRIORITIES,
  DECISION_STATUSES,
  EVIDENCE_DIRECTIONS,
  EVIDENCE_TYPES,
  GRANT_MEMBER_ROLES,
  GRANT_STATUSES,
  HYPOTHESIS_CONFIDENCE_LEVELS,
  HYPOTHESIS_STATUSES,
  IDEA_STATES,
  INBOX_GROUPS,
  MEETING_TYPES,
  MILESTONE_STATUSES,
  PAPER_READINESS_STATUSES,
  PERSON_ROLES,
  PERSON_STATUSES,
  PROJECT_HEALTHS,
  PROJECT_MEMBER_ROLES,
  PROJECT_PRIORITIES,
  PROJECT_STAGES,
  PUBLICATION_STATUSES,
  RESEARCH_QUESTION_STATUSES,
  SUBMISSION_HEALTH_STATUSES,
  SUBMISSION_PLAN_ITEM_STATUSES,
  VENUE_CATEGORIES,
} from "./options";

export type PersonRole = (typeof PERSON_ROLES)[number];
export type PersonStatus = (typeof PERSON_STATUSES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type ProjectHealth = (typeof PROJECT_HEALTHS)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type MeetingType = (typeof MEETING_TYPES)[number];
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];
export type ActionItemPriority = (typeof ACTION_ITEM_PRIORITIES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type GrantStatus = (typeof GRANT_STATUSES)[number];
export type GrantMemberRole = (typeof GRANT_MEMBER_ROLES)[number];
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export type DecisionPriority = (typeof DECISION_PRIORITIES)[number];
export type IdeaState = (typeof IDEA_STATES)[number];
export type InboxGroup = (typeof INBOX_GROUPS)[number];
export type ResearchQuestionStatus = (typeof RESEARCH_QUESTION_STATUSES)[number];
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];
export type HypothesisConfidence = (typeof HYPOTHESIS_CONFIDENCE_LEVELS)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type EvidenceDirection = (typeof EVIDENCE_DIRECTIONS)[number];
export type VenueCategory = (typeof VENUE_CATEGORIES)[number];
export type SubmissionPlanItemStatus = (typeof SUBMISSION_PLAN_ITEM_STATUSES)[number];
export type PaperReadinessStatus = (typeof PAPER_READINESS_STATUSES)[number];
export type SubmissionHealthStatus = (typeof SUBMISSION_HEALTH_STATUSES)[number];

// ---- workspace -----------------------------------------------------------

export interface Workspace {
  id: string;
  name: string;
  institution: string | null;
  pi_name: string;
  pi_person_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceInsert {
  name: string;
  institution?: string | null;
  pi_name: string;
  description?: string | null;
}

export type WorkspaceUpdatePatch = Partial<Omit<Workspace, "id" | "created_at" | "updated_at">>;

// ---- people ----------------------------------------------------------------

export interface Person {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: PersonRole;
  status: PersonStatus;
  start_date: string | null;
  end_date: string | null;
  expected_graduation: string | null;
  research_interests: string[];
  skills: string[];
  bio: string | null;
  website_url: string | null;
  github_url: string | null;
  google_scholar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonInsert {
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  role?: PersonRole;
  status?: PersonStatus;
  start_date?: string | null;
  end_date?: string | null;
  expected_graduation?: string | null;
  research_interests?: string[];
  skills?: string[];
  bio?: string | null;
  website_url?: string | null;
  github_url?: string | null;
  google_scholar_url?: string | null;
  notes?: string | null;
}

export type PersonUpdatePatch = Partial<PersonInsert>;

// ---- projects --------------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  short_name: string | null;
  description: string | null;
  lead_person_id: string | null;
  stage: ProjectStage;
  health: ProjectHealth;
  priority: ProjectPriority;
  start_date: string | null;
  target_date: string | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
  last_update_at: string | null;
  github_url: string | null;
  overleaf_url: string | null;
  drive_url: string | null;
  website_url: string | null;
  research_folder_path: string | null;
  git_repository_path: string | null;
  paper_folder_path: string | null;
  results_folder_path: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  title: string;
  short_name?: string | null;
  description?: string | null;
  lead_person_id?: string | null;
  stage?: ProjectStage;
  health?: ProjectHealth;
  priority?: ProjectPriority;
  start_date?: string | null;
  target_date?: string | null;
  next_milestone?: string | null;
  next_milestone_date?: string | null;
  github_url?: string | null;
  overleaf_url?: string | null;
  drive_url?: string | null;
  website_url?: string | null;
  research_folder_path?: string | null;
  git_repository_path?: string | null;
  paper_folder_path?: string | null;
  results_folder_path?: string | null;
}

export type ProjectUpdatePatch = Partial<ProjectInsert> & { archived?: boolean };

export interface ProjectMember {
  id: string;
  project_id: string;
  person_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  left_at: string | null;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_person_id: string | null;
  summary: string;
  progress: string | null;
  blockers: string | null;
  next_steps: string | null;
  health: ProjectHealth | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  completed_at: string | null;
  owner_person_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneInsert {
  project_id: string;
  title: string;
  description?: string | null;
  status?: MilestoneStatus;
  due_date?: string | null;
  owner_person_id?: string | null;
}

export type MilestoneUpdatePatch = Partial<Omit<MilestoneInsert, "project_id">> & {
  completed_at?: string | null;
};

// ---- meetings ----------------------------------------------------------

export interface Meeting {
  id: string;
  project_id: string | null;
  title: string;
  meeting_type: MeetingType;
  meeting_date: string;
  summary: string | null;
  progress: string | null;
  results: string | null;
  blockers: string | null;
  decisions: string | null;
  next_steps: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingInsert {
  project_id?: string | null;
  title: string;
  meeting_type?: MeetingType;
  meeting_date?: string;
  summary?: string | null;
  progress?: string | null;
  results?: string | null;
  blockers?: string | null;
  decisions?: string | null;
  next_steps?: string | null;
}

export type MeetingUpdatePatch = Partial<MeetingInsert>;

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  person_id: string;
}

// ---- action items ----------------------------------------------------------

export interface ActionItem {
  id: string;
  project_id: string | null;
  meeting_id: string | null;
  assignee_person_id: string | null;
  title: string;
  description: string | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItemInsert {
  project_id?: string | null;
  meeting_id?: string | null;
  assignee_person_id?: string | null;
  title: string;
  description?: string | null;
  status?: ActionItemStatus;
  priority?: ActionItemPriority;
  due_date?: string | null;
}

export type ActionItemUpdatePatch = Partial<Omit<ActionItemInsert, "meeting_id">> & {
  completed_at?: string | null;
};

// ---- publications ------------------------------------------------------

export interface Publication {
  id: string;
  project_id: string | null;
  title: string;
  status: PublicationStatus;
  venue: string | null;
  submission_deadline: string | null;
  submission_date: string | null;
  acceptance_date: string | null;
  publication_date: string | null;
  doi: string | null;
  arxiv_url: string | null;
  overleaf_url: string | null;
  code_url: string | null;
  paper_url: string | null;
  notes: string | null;
  target_venue_cycle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicationInsert {
  project_id?: string | null;
  title: string;
  status?: PublicationStatus;
  venue?: string | null;
  submission_deadline?: string | null;
  submission_date?: string | null;
  acceptance_date?: string | null;
  publication_date?: string | null;
  doi?: string | null;
  arxiv_url?: string | null;
  overleaf_url?: string | null;
  code_url?: string | null;
  paper_url?: string | null;
  notes?: string | null;
  target_venue_cycle_id?: string | null;
}

export type PublicationUpdatePatch = Partial<PublicationInsert>;

export interface PublicationAuthor {
  id: string;
  publication_id: string;
  person_id: string;
  author_order: number;
  is_corresponding: boolean;
  is_equal_contribution: boolean;
}

// ---- grants ------------------------------------------------------------

export interface Grant {
  id: string;
  title: string;
  funder: string | null;
  program: string | null;
  status: GrantStatus;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  currency: string;
  pi_person_id: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantInsert {
  title: string;
  funder?: string | null;
  program?: string | null;
  status?: GrantStatus;
  deadline?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  amount?: number | null;
  currency?: string;
  pi_person_id?: string | null;
  description?: string | null;
  notes?: string | null;
}

export type GrantUpdatePatch = Partial<GrantInsert>;

export interface GrantMember {
  id: string;
  grant_id: string;
  person_id: string;
  role: GrantMemberRole;
}

// ---- attachments (local file/folder references) --------------------------

export type AttachmentEntityType = "project" | "meeting" | "publication" | "grant";
export type AttachmentKind = "file" | "folder";

export interface Attachment {
  id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  kind: AttachmentKind;
  label: string | null;
  path: string;
  created_at: string;
}

export interface AttachmentInsert {
  entity_type: AttachmentEntityType;
  entity_id: string;
  kind: AttachmentKind;
  label?: string | null;
  path: string;
}

// ---- decision requests (Tier 1) -------------------------------------------

export interface DecisionRequest {
  id: string;
  project_id: string | null;
  person_id: string | null;
  title: string;
  context: string | null;
  options_json: string | null;
  recommendation: string | null;
  decision: string | null;
  rationale: string | null;
  status: DecisionStatus;
  priority: DecisionPriority;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

export interface DecisionRequestInsert {
  project_id?: string | null;
  person_id?: string | null;
  title: string;
  context?: string | null;
  options?: string[];
  recommendation?: string | null;
  priority?: DecisionPriority;
}

export type DecisionRequestUpdatePatch = Partial<Omit<DecisionRequestInsert, "options">> & {
  decision?: string | null;
  rationale?: string | null;
  status?: DecisionStatus;
  resolved_at?: string | null;
};

export interface DecisionRequestWithRelations extends Omit<DecisionRequest, "options_json"> {
  options: string[];
  project: { id: string; title: string } | null;
  person: PersonRef | null;
}

// ---- ideas (Tier 1) --------------------------------------------------------

export interface Idea {
  id: string;
  title: string;
  related_project_id: string | null;
  tags_json: string;
  state: IdeaState;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaInsert {
  title: string;
  related_project_id?: string | null;
  tags?: string[];
}

export type IdeaUpdatePatch = Partial<Omit<IdeaInsert, "tags">> & {
  tags?: string[];
  state?: IdeaState;
  converted_project_id?: string | null;
};

export interface IdeaWithRelations extends Omit<Idea, "tags_json"> {
  tags: string[];
  relatedProject: { id: string; title: string } | null;
  convertedProject: { id: string; title: string } | null;
}

// ---- weekly reviews (Tier 1) -----------------------------------------------

export interface WeeklyReviewSnapshot {
  progress: { label: string; count: number }[];
  needsAttention: { label: string; detail: string }[];
  decisions: string[];
  people: { name: string; detail: string }[];
  nextWeek: { label: string; detail: string }[];
}

export interface WeeklyReview {
  id: string;
  week_start: string;
  week_end: string;
  snapshot: WeeklyReviewSnapshot;
  created_at: string;
}

// ---- inbox (Tier 1) ---------------------------------------------------------
// Inbox rows are computed at read time from live data (see
// packages/domain/src/inbox.ts + inboxRepository); `InboxItemState` is the
// only part that's actually persisted, keyed by a stable derived string.

export interface InboxItemState {
  item_key: string;
  snoozed_until: string | null;
  dismissed_at: string | null;
  last_seen_at: string;
}

export type InboxSignalType =
  | "DECISION_OPEN"
  | "PROJECT_STALLED"
  | "PROJECT_STALE"
  | "PROJECT_BLOCKED"
  | "MILESTONE_OVERDUE"
  | "MILESTONE_DUE_SOON"
  | "PUBLICATION_DEADLINE_SOON"
  | "GRANT_DEADLINE_SOON"
  | "PERSON_NOT_SEEN"
  | "ACTION_ITEM_OVERDUE";

export interface InboxSignal {
  type: InboxSignalType;
  label: string;
}

export interface InboxItem {
  /** Stable derived key, e.g. "project:{id}:cluster" or "decision:{id}:open". */
  key: string;
  group: InboxGroup;
  title: string;
  context: string;
  signals: InboxSignal[];
  severity: AttentionSeverityLike;
  href: string;
  entityType: "project" | "decision" | "person" | "publication" | "grant" | "action_item";
  entityId: string;
}

/** Kept structurally compatible with @pi-os/domain's AttentionSeverity without a cross-package dependency. */
export type AttentionSeverityLike = "warning" | "critical";

// ---- timeline (Tier 1) -------------------------------------------------------
// Derived, read-only shape assembled by timelineRepository from multiple
// source tables plus the small `timeline_events` support table. Never
// written to directly by the UI.

export type TimelineEventType =
  | "created"
  | "stage_changed"
  | "health_changed"
  | "update"
  | "milestone_created"
  | "milestone_completed"
  | "meeting"
  | "decision"
  | "publication_linked"
  | "publication_submitted"
  | "publication_accepted";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  summary: string;
  detail: string | null;
}

// ---- research questions / hypotheses / evidence (Tier 2) --------------------

export interface ResearchQuestion {
  id: string;
  project_id: string;
  question: string;
  status: ResearchQuestionStatus;
  priority: DecisionPriority;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ResearchQuestionInsert {
  project_id: string;
  question: string;
  priority?: DecisionPriority;
}

export type ResearchQuestionUpdatePatch = Partial<Omit<ResearchQuestionInsert, "project_id">> & {
  status?: ResearchQuestionStatus;
  resolved_at?: string | null;
};

export interface Hypothesis {
  id: string;
  research_question_id: string | null;
  project_id: string;
  statement: string;
  status: HypothesisStatus;
  confidence: HypothesisConfidence | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface HypothesisInsert {
  project_id: string;
  research_question_id?: string | null;
  statement: string;
  confidence?: HypothesisConfidence | null;
  notes?: string | null;
}

export type HypothesisUpdatePatch = Partial<Omit<HypothesisInsert, "project_id">> & {
  status?: HypothesisStatus;
  resolved_at?: string | null;
};

export interface Evidence {
  id: string;
  hypothesis_id: string;
  project_id: string;
  type: EvidenceType;
  summary: string;
  direction: EvidenceDirection;
  source_type: string | null;
  source_id: string | null;
  local_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceInsert {
  hypothesis_id: string;
  project_id: string;
  type?: EvidenceType;
  summary: string;
  direction?: EvidenceDirection;
  source_type?: string | null;
  source_id?: string | null;
  local_path?: string | null;
}

export interface HypothesisWithEvidence extends Hypothesis {
  evidence: Evidence[];
  supportingCount: number;
  contradictingCount: number;
}

// ---- venues / venue cycles (Tier 2) ------------------------------------------

export interface Venue {
  id: string;
  name: string;
  short_name: string | null;
  category: VenueCategory;
  website_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueInsert {
  name: string;
  short_name?: string | null;
  category?: VenueCategory;
  website_url?: string | null;
  notes?: string | null;
}

export type VenueUpdatePatch = Partial<VenueInsert>;

export interface VenueCycle {
  id: string;
  venue_id: string;
  cycle_label: string;
  abstract_deadline: string | null;
  submission_deadline: string | null;
  rebuttal_start: string | null;
  rebuttal_end: string | null;
  notification_date: string | null;
  camera_ready_date: string | null;
  event_start: string | null;
  event_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueCycleInsert {
  venue_id: string;
  cycle_label: string;
  abstract_deadline?: string | null;
  submission_deadline?: string | null;
  rebuttal_start?: string | null;
  rebuttal_end?: string | null;
  notification_date?: string | null;
  camera_ready_date?: string | null;
  event_start?: string | null;
  event_end?: string | null;
}

export type VenueCycleUpdatePatch = Partial<Omit<VenueCycleInsert, "venue_id">>;

export interface VenueCycleWithVenue extends VenueCycle {
  venue: Pick<Venue, "id" | "name" | "short_name" | "category">;
}

// ---- submission planning / paper readiness (Tier 2) --------------------------

export interface SubmissionPlanItem {
  id: string;
  submission_plan_id: string;
  label: string;
  offset_days: number;
  status: SubmissionPlanItemStatus;
  completed_at: string | null;
  sort_order: number;
}

export interface SubmissionPlan {
  id: string;
  publication_id: string;
  venue_cycle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionPlanWithItems extends SubmissionPlan {
  items: SubmissionPlanItem[];
}

export interface PaperReadinessItem {
  id: string;
  publication_id: string;
  label: string;
  status: PaperReadinessStatus;
  sort_order: number;
}

export interface SubmissionHealth {
  status: SubmissionHealthStatus;
  reason: string;
}

// ---- project stage history (Tier 2) ------------------------------------------

export interface ProjectStageHistoryEntry {
  id: string;
  project_id: string;
  from_stage: ProjectStage | null;
  to_stage: ProjectStage;
  changed_at: string;
}

// ---- composite / joined shapes used throughout the UI ------------------------

export interface PersonRef {
  id: string;
  name: string;
  avatar_url: string | null;
  role: Person["role"];
}

export interface ProjectMemberWithPerson extends ProjectMember {
  person: PersonRef;
}

export interface ProjectWithRelations extends Project {
  lead: PersonRef | null;
  members: ProjectMemberWithPerson[];
}

export interface ProjectListItem extends Project {
  lead: PersonRef | null;
  member_count: number;
}

export interface MilestoneWithOwner extends Milestone {
  owner: PersonRef | null;
}

export interface ProjectUpdateWithAuthor extends ProjectUpdate {
  author: PersonRef | null;
}

export interface MeetingWithRelations extends Meeting {
  project: { id: string; title: string } | null;
  attendees: PersonRef[];
}

export interface PublicationWithRelations extends Publication {
  project: { id: string; title: string } | null;
  authors: (PersonRef & {
    author_order: number;
    is_corresponding: boolean;
    is_equal_contribution: boolean;
  })[];
  targetVenueCycle: VenueCycleWithVenue | null;
}

export interface GrantWithRelations extends Grant {
  pi: PersonRef | null;
  members: (PersonRef & { grantRole: GrantMemberRole })[];
}

export interface ActionItemWithRelations extends ActionItem {
  assignee: PersonRef | null;
  project: { id: string; title: string } | null;
}

export interface PersonWithStats extends Person {
  active_project_count: number;
  led_project_count: number;
}
