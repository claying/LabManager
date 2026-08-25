"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { publicationSchema, type PublicationInput } from "@pi-os/domain";
import type { Person, Project } from "@pi-os/types";
import { PUBLICATION_STATUSES, PUBLICATION_STATUS_LABELS } from "@pi-os/types";
import { useCreatePublication } from "@pi-os/repositories";
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

function defaultValues(projectId?: string): PublicationInput {
  return {
    title: "",
    status: "idea",
    venue: null,
    project_id: projectId ?? null,
    submission_deadline: null,
    submission_date: null,
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: null,
    author_person_ids: [],
  };
}

export function PublicationFormDialog({
  projects,
  people,
  projectId,
  open,
  onOpenChange,
}: {
  projects: Pick<Project, "id" | "title">[];
  people: Person[];
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPublication = useCreatePublication();
  const form = useForm<PublicationInput>({
    resolver: zodResolver(publicationSchema),
    defaultValues: defaultValues(projectId),
  });

  useEffect(() => {
    if (open) form.reset(defaultValues(projectId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function onSubmit(values: PublicationInput) {
    try {
      await createPublication.mutateAsync(values);
      toast.success("Publication added");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save publication", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New publication</DialogTitle>
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
                    <Input placeholder="Geometric Flow Matching for Protein Design" {...field} />
                  </FormControl>
                  <FormMessage />
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
                        {PUBLICATION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PUBLICATION_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target venue</FormLabel>
                    <FormControl>
                      <Input placeholder="NeurIPS 2026" {...field} value={field.value ?? ""} />
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
              name="author_person_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authors (in order)</FormLabel>
                  <MultiPersonSelect
                    people={people}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select authors"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="submission_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="arxiv_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>arXiv URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overleaf_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overleaf URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
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
              <Button type="submit" disabled={createPublication.isPending}>
                {createPublication.isPending ? "Saving…" : "Save publication"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
