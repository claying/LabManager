"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { milestoneSchema, type MilestoneInput } from "@pi-os/domain";
import type { MilestoneWithOwner, Person } from "@pi-os/types";
import { MILESTONE_STATUSES } from "@pi-os/types";
import { useCreateMilestone, useUpdateMilestone } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pi-os/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@pi-os/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { toast } from "@pi-os/ui/components/sonner";
import { PersonSelect } from "../shared/person-select";

function defaultsFor(milestone?: MilestoneWithOwner): MilestoneInput {
  return {
    title: milestone?.title ?? "",
    description: milestone?.description ?? null,
    status: milestone?.status ?? "planned",
    due_date: milestone?.due_date ?? null,
    owner_person_id: milestone?.owner_person_id ?? null,
  };
}

export function MilestoneDialog({
  projectId,
  people,
  milestone,
  open,
  onOpenChange,
}: {
  projectId: string;
  people: Person[];
  milestone?: MilestoneWithOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const isEdit = Boolean(milestone);

  const form = useForm<MilestoneInput>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: defaultsFor(milestone),
  });

  useEffect(() => {
    if (open) form.reset(defaultsFor(milestone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, milestone]);

  async function onSubmit(values: MilestoneInput) {
    try {
      if (isEdit && milestone) {
        await updateMilestone.mutateAsync({ milestoneId: milestone.id, patch: values });
        toast.success("Milestone updated");
      } else {
        await createMilestone.mutateAsync(values);
        toast.success("Milestone added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save milestone", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const pending = createMilestone.isPending || updateMilestone.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit milestone" : "Add milestone"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Submit to NeurIPS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MILESTONE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="owner_person_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <PersonSelect people={people} value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Add milestone"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
