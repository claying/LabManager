"use client";

import type { Project } from "@pi-os/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";

export function ProjectSelect({
  projects,
  value,
  onChange,
  placeholder = "No project",
}: {
  projects: Pick<Project, "id" | "title">[];
  value: string | null | undefined;
  onChange: (projectId: string | null) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">No project</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
