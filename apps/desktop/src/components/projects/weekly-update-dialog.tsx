"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { projectUpdateSchema, type ProjectUpdateInput } from "@pi-os/domain";
import { PROJECT_HEALTHS, PROJECT_HEALTH_LABELS } from "@pi-os/types";
import { useSubmitProjectUpdate } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * The Weekly Update workflow (SPEC.md section 12) — the single most
 * important interaction in the app. Only "What changed" is required;
 * health/next-milestone are optional side effects applied on submit.
 */
export function WeeklyUpdateDialog({
  projectId,
  authorPersonId,
  open,
  onOpenChange,
}: {
  projectId: string;
  authorPersonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitUpdate = useSubmitProjectUpdate(projectId);

  const form = useForm<ProjectUpdateInput>({
    resolver: zodResolver(projectUpdateSchema),
    defaultValues: {
      summary: "",
      progress: null,
      blockers: null,
      next_steps: null,
      health: null,
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
  });

  async function onSubmit(values: ProjectUpdateInput) {
    try {
      await submitUpdate.mutateAsync({ authorPersonId, input: values });
      toast.success("Update posted");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't post update", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Update</DialogTitle>
          <DialogDescription>
            Post a weekly update to this project&apos;s journal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What changed since the previous update?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      autoFocus
                      placeholder="Ran the full ablation sweep on the new loss term…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress / key results</FormLabel>
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
                  <FormLabel>Blockers</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next_steps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next steps</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="border-border grid grid-cols-2 gap-4 rounded-md border border-dashed p-3">
              <FormField
                control={form.control}
                name="health"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Update project health? (optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__unchanged" ? null : v)}
                      value={field.value ?? "__unchanged"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__unchanged">Leave unchanged</SelectItem>
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
                name="update_next_milestone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">
                      New next milestone (optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Submit to NeurIPS" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="update_next_milestone_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs">Milestone date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitUpdate.isPending}>
                {submitUpdate.isPending ? "Posting…" : "Post update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
