"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  hypothesisSchema,
  evidenceSchema,
  type HypothesisInput,
  type EvidenceInput,
} from "@pi-os/domain";
import {
  HYPOTHESIS_STATUSES,
  HYPOTHESIS_STATUS_LABELS,
  EVIDENCE_DIRECTIONS,
  EVIDENCE_DIRECTION_LABELS,
  EVIDENCE_TYPE_LABELS,
} from "@pi-os/types";
import type { HypothesisWithEvidence } from "@pi-os/types";
import {
  useCreateHypothesis,
  useUpdateHypothesis,
  useDeleteHypothesis,
  useCreateEvidence,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@pi-os/ui/components/sheet";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@pi-os/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { toast } from "@pi-os/ui/components/sonner";
import { Plus } from "lucide-react";

const DIRECTION_COLOR: Record<(typeof EVIDENCE_DIRECTIONS)[number], string> = {
  supports: "text-success",
  contradicts: "text-destructive",
  mixed: "text-warning",
  neutral: "text-muted-foreground",
};

function EvidenceQuickAdd({
  hypothesisId,
  projectId,
}: {
  hypothesisId: string;
  projectId: string;
}) {
  const createEvidence = useCreateEvidence();
  const form = useForm<EvidenceInput>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      summary: "",
      type: "observation",
      direction: "supports",
      source_type: null,
      local_path: null,
    },
  });

  async function onSubmit(values: EvidenceInput) {
    try {
      await createEvidence.mutateAsync({
        ...values,
        hypothesis_id: hypothesisId,
        project_id: projectId,
      });
      form.reset({
        summary: "",
        type: "observation",
        direction: "supports",
        source_type: null,
        local_path: null,
      });
    } catch (error) {
      toast.error("Couldn't add evidence", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-border space-y-2 rounded-md border border-dashed p-2.5"
      >
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="RM-GEL improves 3D RMSE by 0.8%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {EVIDENCE_DIRECTION_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Button type="submit" size="sm" disabled={createEvidence.isPending}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function HypothesisPanel({
  open,
  onOpenChange,
  projectId,
  researchQuestionId,
  hypothesis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  researchQuestionId?: string | null;
  /** Undefined = create mode. */
  hypothesis?: HypothesisWithEvidence;
}) {
  const createHypothesis = useCreateHypothesis();
  const updateHypothesis = useUpdateHypothesis();
  const deleteHypothesis = useDeleteHypothesis();

  const form = useForm<HypothesisInput>({
    resolver: zodResolver(hypothesisSchema),
    defaultValues: {
      statement: hypothesis?.statement ?? "",
      research_question_id: hypothesis?.research_question_id ?? researchQuestionId ?? null,
      confidence: hypothesis?.confidence ?? null,
      notes: hypothesis?.notes ?? null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        statement: hypothesis?.statement ?? "",
        research_question_id: hypothesis?.research_question_id ?? researchQuestionId ?? null,
        confidence: hypothesis?.confidence ?? null,
        notes: hypothesis?.notes ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hypothesis]);

  async function onSubmit(values: HypothesisInput) {
    try {
      if (hypothesis) {
        await updateHypothesis.mutateAsync({ id: hypothesis.id, patch: values });
        toast.success("Hypothesis updated");
      } else {
        await createHypothesis.mutateAsync({ ...values, project_id: projectId });
        toast.success("Hypothesis added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save hypothesis", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onDelete() {
    if (!hypothesis) return;
    try {
      await deleteHypothesis.mutateAsync({ id: hypothesis.id, projectId });
      toast("Hypothesis removed");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't remove hypothesis", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const pending = createHypothesis.isPending || updateHypothesis.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{hypothesis ? "Hypothesis" : "New hypothesis"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="statement"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Recurrent metric refinement improves 3D realization"
                      autoFocus
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
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                    value={field.value ?? "__none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Confidence (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none">No confidence set</SelectItem>
                      <SelectItem value="low">Low confidence</SelectItem>
                      <SelectItem value="medium">Medium confidence</SelectItem>
                      <SelectItem value="high">High confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Notes (optional)"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {hypothesis && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {HYPOTHESIS_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        updateHypothesis.mutate({
                          id: hypothesis.id,
                          patch: {
                            status: s,
                            resolved_at:
                              s === "supported" || s === "not_supported"
                                ? new Date().toISOString()
                                : null,
                          },
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        hypothesis.status === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {HYPOTHESIS_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SheetFooter>
              {hypothesis && (
                <Button type="button" variant="ghost" onClick={onDelete}>
                  Remove
                </Button>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : hypothesis ? "Save" : "Add hypothesis"}
              </Button>
            </SheetFooter>
          </form>
        </Form>

        {hypothesis && (
          <div className="border-border space-y-2 border-t pt-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Evidence ({hypothesis.supportingCount} supporting · {hypothesis.contradictingCount}{" "}
              contradicting)
            </p>
            <div className="space-y-1.5">
              {hypothesis.evidence.map((e) => (
                <div key={e.id} className="text-sm">
                  <span className={DIRECTION_COLOR[e.direction]}>●</span>{" "}
                  <span className="text-foreground">{e.summary}</span>
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    · {EVIDENCE_TYPE_LABELS[e.type]}
                  </span>
                </div>
              ))}
              {hypothesis.evidence.length === 0 && (
                <p className="text-muted-foreground text-sm">No evidence yet.</p>
              )}
            </div>
            <EvidenceQuickAdd hypothesisId={hypothesis.id} projectId={projectId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
