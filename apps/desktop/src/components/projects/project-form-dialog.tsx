"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { projectSchema, type ProjectInput } from "@pi-os/domain";
import type { Person, Project } from "@pi-os/types";
import {
  PROJECT_HEALTHS,
  PROJECT_HEALTH_LABELS,
  PROJECT_PRIORITIES,
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
} from "@pi-os/types";
import { useCreateProject, useUpdateProject, pickFolder } from "@pi-os/repositories";
import { FolderOpen } from "lucide-react";
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

function defaultsFor(project?: Project): ProjectInput {
  return {
    title: project?.title ?? "",
    short_name: project?.short_name ?? null,
    description: project?.description ?? null,
    lead_person_id: project?.lead_person_id ?? null,
    stage: project?.stage ?? "idea",
    health: project?.health ?? "healthy",
    priority: project?.priority ?? "medium",
    start_date: project?.start_date ?? null,
    target_date: project?.target_date ?? null,
    next_milestone: project?.next_milestone ?? null,
    next_milestone_date: project?.next_milestone_date ?? null,
    github_url: project?.github_url ?? null,
    overleaf_url: project?.overleaf_url ?? null,
    drive_url: project?.drive_url ?? null,
    website_url: project?.website_url ?? null,
    research_folder_path: project?.research_folder_path ?? null,
    git_repository_path: project?.git_repository_path ?? null,
    paper_folder_path: project?.paper_folder_path ?? null,
    results_folder_path: project?.results_folder_path ?? null,
  };
}

export function ProjectFormDialog({
  people,
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  people: Person[];
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (projectId: string) => void;
}) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEdit = Boolean(project);

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultsFor(project),
  });

  useEffect(() => {
    if (open) form.reset(defaultsFor(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  async function onSubmit(values: ProjectInput) {
    try {
      if (isEdit && project) {
        await updateProject.mutateAsync({ projectId: project.id, patch: values });
        toast.success("Project updated");
        onSaved?.(project.id);
      } else {
        const created = await createProject.mutateAsync(values);
        toast.success("Project created");
        onSaved?.(created.id);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save project", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const pending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "Create project"}</DialogTitle>
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
                    <Input
                      placeholder="Geometric Flow Matching"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="short_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short name</FormLabel>
                    <FormControl>
                      <Input placeholder="GraphFM" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lead_person_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead</FormLabel>
                    <PersonSelect people={people} value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROJECT_STAGE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="health"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_HEALTHS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {PROJECT_HEALTH_LABELS[h]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="next_milestone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next milestone</FormLabel>
                    <FormControl>
                      <Input placeholder="Submit to NeurIPS" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="next_milestone_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next milestone date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="github_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://github.com/…"
                        {...field}
                        value={field.value ?? ""}
                      />
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
                      <Input
                        placeholder="https://overleaf.com/…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="drive_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drive URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://drive.google.com/…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-border space-y-3 rounded-md border border-dashed p-3">
              <p className="text-muted-foreground text-xs font-medium">Local files (optional)</p>
              {(
                [
                  ["research_folder_path", "Research folder"],
                  ["git_repository_path", "Git repository"],
                  ["paper_folder_path", "Paper folder"],
                  ["results_folder_path", "Results folder"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            readOnly
                            placeholder="No folder chosen"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            const dir = await pickFolder(`Choose ${label.toLowerCase()}`);
                            if (dir) field.onChange(dir);
                          }}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
