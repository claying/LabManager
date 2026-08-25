"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Person } from "@pi-os/types";
import { Badge } from "@pi-os/ui/components/badge";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";

export interface PersonRow extends Person {
  activeProjectCount: number;
  ledProjectCount: number;
}

export const personColumns: ColumnDef<PersonRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <PersonAvatar name={row.original.name} avatarUrl={row.original.avatar_url} size="sm" />
        <span className="text-foreground font-medium">{row.original.name}</span>
      </div>
    ),
  },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "activeProjectCount",
    header: "Projects",
    cell: ({ row }) => <span className="tabular-nums">{row.original.activeProjectCount}</span>,
  },
  {
    accessorKey: "ledProjectCount",
    header: "Project Lead Count",
    cell: ({ row }) => <span className="tabular-nums">{row.original.ledProjectCount}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "success" : "muted"}
        className="capitalize"
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) =>
      row.original.start_date ? new Date(row.original.start_date).toLocaleDateString() : "—",
  },
  {
    accessorKey: "expected_graduation",
    header: "Expected Graduation",
    cell: ({ row }) =>
      row.original.expected_graduation
        ? new Date(row.original.expected_graduation).toLocaleDateString()
        : "—",
  },
  {
    accessorKey: "research_interests",
    header: "Research Interests",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.research_interests.join(", ") || "—"}
      </span>
    ),
  },
];
