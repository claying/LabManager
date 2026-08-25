"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { researchQuestionSchema, type ResearchQuestionInput } from "@pi-os/domain";
import { RESEARCH_QUESTION_STATUSES, RESEARCH_QUESTION_STATUS_LABELS } from "@pi-os/types";
import type { ResearchQuestion } from "@pi-os/types";
import {
  useCreateResearchQuestion,
  useUpdateResearchQuestion,
  useDeleteResearchQuestion,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
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

export function ResearchQuestionPanel({
  open,
  onOpenChange,
  projectId,
  question,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Undefined = create mode. */
  question?: ResearchQuestion;
}) {
  const createQuestion = useCreateResearchQuestion();
  const updateQuestion = useUpdateResearchQuestion();
  const deleteQuestion = useDeleteResearchQuestion();

  const form = useForm<ResearchQuestionInput>({
    resolver: zodResolver(researchQuestionSchema),
    defaultValues: { question: question?.question ?? "", priority: question?.priority ?? "normal" },
  });

  useEffect(() => {
    if (open)
      form.reset({ question: question?.question ?? "", priority: question?.priority ?? "normal" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question]);

  async function onSubmit(values: ResearchQuestionInput) {
    try {
      if (question) {
        await updateQuestion.mutateAsync({ id: question.id, patch: values });
        toast.success("Question updated");
      } else {
        await createQuestion.mutateAsync({ ...values, project_id: projectId });
        toast.success("Question added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save question", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onDelete() {
    if (!question) return;
    try {
      await deleteQuestion.mutateAsync({ id: question.id, projectId });
      toast("Question removed");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't remove question", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const pending = createQuestion.isPending || updateQuestion.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{question ? "Question" : "New question"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Does recurrent metric refinement help?"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {question && (
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal priority</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
            {question && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RESEARCH_QUESTION_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        updateQuestion.mutate({
                          id: question.id,
                          patch: {
                            status: s,
                            resolved_at: s === "answered" ? new Date().toISOString() : null,
                          },
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        question.status === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {RESEARCH_QUESTION_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <SheetFooter>
              {question && (
                <Button type="button" variant="ghost" onClick={onDelete}>
                  Remove
                </Button>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : question ? "Save" : "Add question"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
