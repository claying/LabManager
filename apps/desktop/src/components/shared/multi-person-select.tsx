"use client";

import { useState } from "react";
import type { Person } from "@pi-os/types";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@pi-os/ui/components/button";
import { Checkbox } from "@pi-os/ui/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@pi-os/ui/components/popover";

export function MultiPersonSelect({
  people,
  value,
  onChange,
  placeholder = "Select people",
}: {
  people: Person[];
  value: string[];
  onChange: (personIds: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(personId: string) {
    onChange(
      value.includes(personId) ? value.filter((id) => id !== personId) : [...value, personId],
    );
  }

  const label = value.length === 0 ? placeholder : `${value.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span
            className="text-muted-foreground data-[has-value=true]:text-foreground truncate"
            data-has-value={value.length > 0}
          >
            {label}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-72 w-72 overflow-y-auto p-2" align="start">
        <div className="space-y-1">
          {people.map((person) => (
            <label
              key={person.id}
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={value.includes(person.id)}
                onCheckedChange={() => toggle(person.id)}
              />
              <span className="truncate">{person.name}</span>
            </label>
          ))}
          {people.length === 0 && (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">No people yet.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
