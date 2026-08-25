"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ProjectListItem } from "@pi-os/types";
import { HealthBadge, PriorityBadge, StageBadge } from "@pi-os/ui/components/domain/status-badge";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const projectColumns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: "title",
    header: "Project",
    cell: ({ row }) => (
      <div>
        <p className="text-foreground font-medium">{row.original.title}</p>
        {row.original.short_name && (
          <p className="text-muted-foreground text-xs">{row.original.short_name}</p>
        )}
      </div>
    ),
  },
  {
    id: "lead",
    accessorFn: (row) => row.lead?.name ?? "",
    header: "Lead",
    cell: ({ row }) =>
      row.original.lead ? (
        <div className="flex items-center gap-2">
          <PersonAvatar name={row.original.lead.name} size="sm" />
          <span className="text-sm">{row.original.lead.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },
  {
    accessorKey: "member_count",
    header: "Members",
    cell: ({ row }) => <span className="tabular-nums">{row.original.member_count}</span>,
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => <StageBadge stage={row.original.stage} />,
  },
  {
    accessorKey: "health",
    header: "Health",
    cell: ({ row }) => <HealthBadge health={row.original.health} />,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "next_milestone",
    header: "Next Milestone",
    cell: ({ row }) => <span className="text-sm">{row.original.next_milestone ?? "—"}</span>,
  },
  {
    id: "deadline",
    accessorKey: "next_milestone_date",
    header: "Deadline",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{formatDate(row.original.next_milestone_date)}</span>
    ),
  },
  {
    id: "last_update",
    accessorKey: "last_update_at",
    header: "Last Update",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {formatDate(row.original.last_update_at)}
      </span>
    ),
  },
];
