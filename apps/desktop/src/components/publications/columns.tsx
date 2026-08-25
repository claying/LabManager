"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { PublicationWithRelations } from "@pi-os/types";
import { daysUntil } from "@pi-os/domain";
import { Badge } from "@pi-os/ui/components/badge";
import { PublicationStatusBadge } from "@pi-os/ui/components/domain/status-badge";

export const publicationColumns: ColumnDef<PublicationWithRelations>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="text-foreground font-medium">{row.original.title}</span>,
  },
  {
    id: "authors",
    header: "Authors",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.authors.map((a) => a.name).join(", ") || "—"}
      </span>
    ),
  },
  {
    id: "project",
    header: "Project",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.project?.title ?? "—"}</span>
    ),
  },
  { accessorKey: "venue", header: "Target Venue", cell: ({ row }) => row.original.venue ?? "—" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <PublicationStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "submission_deadline",
    header: "Deadline",
    cell: ({ row }) => {
      const deadline = row.original.submission_deadline;
      if (!deadline) return <span className="text-muted-foreground text-sm">—</span>;
      const days = daysUntil(new Date(deadline), new Date());
      const variant =
        days < 0
          ? "destructive"
          : days <= 7
            ? "destructive"
            : days <= 30
              ? "warning"
              : days <= 60
                ? "secondary"
                : "muted";
      return (
        <Badge variant={variant}>
          {new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Badge>
      );
    },
  },
];
