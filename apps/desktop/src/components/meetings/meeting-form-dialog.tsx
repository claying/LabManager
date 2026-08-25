"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { meetingSchema, type MeetingInput } from "@pi-os/domain";
import type { Person, Project } from "@pi-os/types";
import { MEETING_TYPES, MEETING_TYPE_LABELS } from "@pi-os/types";
import { useCreateMeeting } from "@pi-os/repositories";
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
import { MultiPersonSelect } from "../shared/multi-person-select";

function defaultValues(projectId?: string): MeetingInput {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    title: "",
    meeting_type: projectId ? "project" : "lab",
    meeting_date: now.toISOString().slice(0, 16),
    project_id: projectId ?? null,
    attendee_person_ids: [],
    progress: null,
    results: null,
    blockers: null,
    decisions: null,
    next_steps: null,
  };
}

export function MeetingFormDialog({
  createdBy,
  projects,
  people,
  projectId,
  open,
  onOpenChange,
}: {
  createdBy: string | null;
  projects: Pick<Project, "id" | "title">[];
  people: Person[];
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMeeting = useCreateMeeting(createdBy);

  const form = useForm<MeetingInput>({
    resolver: zodResolver(meetingSchema),
    defaultValues: defaultValues(projectId),
  });

  useEffect(() => {
    if (open) form.reset(defaultValues(projectId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function onSubmit(values: MeetingInput) {
    try {
      await createMeeting.mutateAsync(values);
      toast.success("Meeting logged");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save meeting", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New meeting</DialogTitle>
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
                    <Input placeholder="Weekly sync — GraphFM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meeting_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEETING_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {MEETING_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meeting_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date &amp; time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {!projectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                      value={field.value ?? "__none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="attendee_person_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <MultiPersonSelect
                    people={people}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress since last meeting</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="results"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Results / findings</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="blockers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problems / blockers</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="decisions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Decisions</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      className="border-primary/30 bg-primary/[0.03]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next_steps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next actions</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMeeting.isPending}>
                {createMeeting.isPending ? "Saving…" : "Save meeting"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
