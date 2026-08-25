import type {
  ActionItemPriority,
  ActionItemStatus,
  GrantStatus,
  MilestoneStatus,
  ProjectHealth,
  ProjectPriority,
  ProjectStage,
  PublicationStatus,
} from "@pi-os/types";
import {
  GRANT_STATUS_LABELS,
  PROJECT_HEALTH_LABELS,
  PROJECT_STAGE_LABELS,
  PUBLICATION_STATUS_LABELS,
} from "@pi-os/types";
import { Badge, type BadgeProps } from "../badge";

const HEALTH_VARIANT: Record<ProjectHealth, BadgeProps["variant"]> = {
  healthy: "success",
  attention: "warning",
  at_risk: "warning",
  stalled: "destructive",
};

export function HealthBadge({ health, className }: { health: ProjectHealth; className?: string }) {
  return (
    <Badge variant={HEALTH_VARIANT[health]} className={className}>
      {PROJECT_HEALTH_LABELS[health]}
    </Badge>
  );
}

export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      {PROJECT_STAGE_LABELS[stage]}
    </Badge>
  );
}

const PRIORITY_VARIANT: Record<ProjectPriority, BadgeProps["variant"]> = {
  low: "muted",
  medium: "secondary",
  high: "warning",
  critical: "destructive",
};

const PRIORITY_LABEL: Record<ProjectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: ProjectPriority;
  className?: string;
}) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className={className}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

const PUBLICATION_VARIANT: Record<PublicationStatus, BadgeProps["variant"]> = {
  idea: "muted",
  experiments: "secondary",
  drafting: "secondary",
  internal_review: "warning",
  submitted: "default",
  rebuttal: "warning",
  accepted: "success",
  published: "success",
  withdrawn: "destructive",
};

export function PublicationStatusBadge({
  status,
  className,
}: {
  status: PublicationStatus;
  className?: string;
}) {
  return (
    <Badge variant={PUBLICATION_VARIANT[status]} className={className}>
      {PUBLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

const GRANT_VARIANT: Record<GrantStatus, BadgeProps["variant"]> = {
  idea: "muted",
  preparing: "secondary",
  submitted: "default",
  awarded: "success",
  rejected: "destructive",
  active: "success",
  completed: "muted",
};

export function GrantStatusBadge({
  status,
  className,
}: {
  status: GrantStatus;
  className?: string;
}) {
  return (
    <Badge variant={GRANT_VARIANT[status]} className={className}>
      {GRANT_STATUS_LABELS[status]}
    </Badge>
  );
}

const MILESTONE_VARIANT: Record<MilestoneStatus, BadgeProps["variant"]> = {
  planned: "muted",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
};

const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function MilestoneStatusBadge({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}) {
  return (
    <Badge variant={MILESTONE_VARIANT[status]} className={className}>
      {MILESTONE_LABEL[status]}
    </Badge>
  );
}

const ACTION_ITEM_PRIORITY_VARIANT: Record<ActionItemPriority, BadgeProps["variant"]> = {
  low: "muted",
  medium: "secondary",
  high: "warning",
  urgent: "destructive",
};

export function ActionItemPriorityBadge({
  priority,
  className,
}: {
  priority: ActionItemPriority;
  className?: string;
}) {
  return (
    <Badge variant={ACTION_ITEM_PRIORITY_VARIANT[priority]} className={className}>
      {priority[0]?.toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

const ACTION_ITEM_STATUS_VARIANT: Record<ActionItemStatus, BadgeProps["variant"]> = {
  open: "secondary",
  in_progress: "default",
  done: "success",
  cancelled: "muted",
};

export function ActionItemStatusBadge({
  status,
  className,
}: {
  status: ActionItemStatus;
  className?: string;
}) {
  return (
    <Badge variant={ACTION_ITEM_STATUS_VARIANT[status]} className={className}>
      {status.replace("_", " ")}
    </Badge>
  );
}
