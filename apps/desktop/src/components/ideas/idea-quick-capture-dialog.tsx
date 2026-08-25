"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ideaSchema, type IdeaInput } from "@pi-os/domain";
import type { Project } from "@pi-os/types";
import { useCreateIdea } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@pi-os/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@pi-os/ui/components/form";
import { toast } from "@pi-os/ui/components/sonner";
import { ProjectSelect } from "../shared/project-select";

const defaults: IdeaInput = { title: "", related_project_id: null, tags: [] };

/** SPEC_followup section 12 — capture speed matters more than completeness; only title is required. */
export function IdeaQuickCaptureDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Pick<Project, "id" | "title">[];
}) {
  const createIdea = useCreateIdea();
  const [tagsText, setTagsText] = useState("");
  const form = useForm<IdeaInput>({ resolver: zodResolver(ideaSchema), defaultValues: defaults });

  useEffect(() => {
    if (open) {
      form.reset(defaults);
      setTagsText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: IdeaInput) {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await createIdea.mutateAsync({ ...values, tags });
      toast.success("Idea captured");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save idea", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New idea</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="What's the idea?" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="related_project_id"
              render={({ field }) => (
                <FormItem>
                  <ProjectSelect
                    projects={projects}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Related project (optional)"
                  />
                </FormItem>
              )}
            />
            <Input
              placeholder="Tags, comma separated (optional)"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={createIdea.isPending}>
                {createIdea.isPending ? "Saving…" : "Capture"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
