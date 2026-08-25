"use client";

import type { Person } from "@pi-os/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";

export function PersonSelect({
  people,
  value,
  onChange,
  placeholder = "Select person",
  allowNone = true,
}: {
  people: Person[];
  value: string | null | undefined;
  onChange: (personId: string | null) => void;
  placeholder?: string;
  allowNone?: boolean;
}) {
  return (
    <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none">Unassigned</SelectItem>}
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
