"use client";

import { useState } from "react";
import type { Person, ProjectMemberRole, ProjectMemberWithPerson } from "@pi-os/types";
import { PROJECT_MEMBER_ROLES } from "@pi-os/types";
import { useAddProjectMember, useRemoveProjectMember } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import { Badge } from "@pi-os/ui/components/badge";
import { toast } from "@pi-os/ui/components/sonner";
import { X } from "lucide-react";
import { PersonSelect } from "../shared/person-select";

export function ProjectMembersDialog({
  projectId,
  members,
  people,
  open,
  onOpenChange,
}: {
  projectId: string;
  members: ProjectMemberWithPerson[];
  people: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<ProjectMemberRole>("core_member");

  const availablePeople = people.filter((p) => !members.some((m) => m.person.id === p.id));

  async function handleAdd() {
    if (!newPersonId) return;
    try {
      await addMember.mutateAsync({ personId: newPersonId, role: newRole });
      setNewPersonId(null);
      toast.success("Member added");
    } catch (error) {
      toast.error("Couldn't add member", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember.mutateAsync(memberId);
    } catch (error) {
      toast.error("Couldn't remove member", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage members</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <PersonAvatar name={m.person.name} avatarUrl={m.person.avatar_url} size="sm" />
                <span className="text-sm">{m.person.name}</span>
                <Badge variant="secondary" className="capitalize">
                  {m.role.replace("_", " ")}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemove(m.id)}
                aria-label="Remove member"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">No members yet.</p>
          )}
        </div>

        <div className="border-border flex items-end gap-2 border-t pt-4">
          <div className="flex-1 space-y-1">
            <p className="text-muted-foreground text-xs font-medium">Add member</p>
            <PersonSelect
              people={availablePeople}
              value={newPersonId}
              onChange={setNewPersonId}
              allowNone={false}
              placeholder="Choose person"
            />
          </div>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as ProjectMemberRole)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_MEMBER_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newPersonId || addMember.isPending}>
            Add
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
