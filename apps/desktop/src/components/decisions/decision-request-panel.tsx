"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { decisionRequestSchema, type DecisionRequestInput } from "@pi-os/domain";
import { DECISION_PRIORITIES } from "@pi-os/types";
import type { DecisionRequestWithRelations, Project } from "@pi-os/types";
import {
  useCreateDecisionRequest,
  useResolveDecisionRequest,
  useDeferDecisionRequest,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import { Badge } from "@pi-os/ui/components/badge";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@pi-os/ui/components/sheet";
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
import { ProjectSelect } from "../shared/project-select";

const PRIORITY_LABEL: Record<(typeof DECISION_PRIORITIES)[number], string> = {
  normal: "Normal",
  important: "Important",
  urgent: "Urgent",
};

function CreateForm({
  projects,
  projectId,
  onCreated,
}: {
  projects: Pick<Project, "id" | "title">[];
  projectId?: string;
  onCreated: () => void;
}) {
  const createDecision = useCreateDecisionRequest();
  const [optionsText, setOptionsText] = useState("");

  const form = useForm<DecisionRequestInput>({
    resolver: zodResolver(decisionRequestSchema),
    defaultValues: {
      title: "",
      project_id: projectId ?? null,
      context: null,
      options: [],
      recommendation: null,
      priority: "normal",
    },
  });

  async function onSubmit(values: DecisionRequestInput) {
    const options = optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    try {
      await createDecision.mutateAsync({ ...values, options });
      toast.success("Decision requested");
      onCreated();
    } catch (error) {
      toast.error("Couldn't create decision", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Input placeholder="Which benchmark?" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <ProjectSelect projects={projects} value={field.value} onChange={field.onChange} />
            </FormItem>
          )}
        />
        <div className="space-y-1.5">
          <FormLabel>Options</FormLabel>
          <Textarea
            rows={3}
            placeholder={"QM9\nSynthetic rigid graphs"}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">One per line, optional.</p>
        </div>
        <FormField
          control={form.control}
          name="recommendation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recommendation</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} value={field.value ?? ""} />
              </FormControl>
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
                  {DECISION_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <SheetFooter>
          <Button type="submit" disabled={createDecision.isPending}>
            {createDecision.isPending ? "Saving…" : "Request decision"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

function ResolveView({
  decision,
  onDone,
}: {
  decision: DecisionRequestWithRelations;
  onDone: () => void;
}) {
  const resolve = useResolveDecisionRequest();
  const defer = useDeferDecisionRequest();
  const [chosen, setChosen] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");

  async function confirm() {
    if (!chosen) return;
    try {
      await resolve.mutateAsync({
        id: decision.id,
        decision: chosen,
        rationale: rationale.trim() || null,
      });
      toast.success("Decision recorded");
      onDone();
    } catch (error) {
      toast.error("Couldn't save decision", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onDefer() {
    try {
      await defer.mutateAsync(decision.id);
      toast.success("Deferred");
      onDone();
    } catch (error) {
      toast.error("Couldn't defer", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (decision.status !== "open") {
    return (
      <div className="space-y-3">
        <p className="text-foreground text-sm font-medium">{decision.title}</p>
        {decision.status === "resolved" ? (
          <>
            <p className="text-foreground text-sm">{decision.decision}</p>
            {decision.rationale && (
              <p className="text-muted-foreground text-xs">{decision.rationale}</p>
            )}
          </>
        ) : (
          <Badge variant="muted">Deferred</Badge>
        )}
      </div>
    );
  }

  if (chosen) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-foreground text-sm font-medium">{decision.title}</p>
        <div className="border-primary/30 bg-primary/[0.04] rounded-md border p-3 text-sm">
          {chosen}
        </div>
        <div className="space-y-1.5">
          <FormLabel>Why? optional</FormLabel>
          <Textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            autoFocus
          />
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => setChosen(null)}>
            Back
          </Button>
          <Button onClick={confirm} disabled={resolve.isPending}>
            {resolve.isPending ? "Saving…" : "Confirm"}
          </Button>
        </SheetFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{decision.title}</p>
        {decision.context && <p className="text-muted-foreground text-sm">{decision.context}</p>}
      </div>
      {decision.options.length > 0 ? (
        <div className="space-y-2">
          {decision.options.map((option) => (
            <button
              key={option}
              onClick={() => setChosen(option)}
              className="border-border hover:border-foreground/30 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
            >
              {option}
              {decision.recommendation === option && <Badge variant="secondary">Recommended</Badge>}
            </button>
          ))}
        </div>
      ) : (
        <Input
          placeholder="Type the decision…"
          onKeyDown={(e) => e.key === "Enter" && setChosen(e.currentTarget.value)}
        />
      )}
      <SheetFooter>
        <Button variant="ghost" onClick={onDefer} disabled={defer.isPending}>
          Defer
        </Button>
      </SheetFooter>
    </div>
  );
}

export function DecisionRequestPanel({
  open,
  onOpenChange,
  decision,
  projects,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Undefined = create mode. */
  decision?: DecisionRequestWithRelations;
  projects: Pick<Project, "id" | "title">[];
  projectId?: string;
}) {
  function close() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{decision ? "Decision" : "New decision"}</SheetTitle>
        </SheetHeader>
        {decision ? (
          <ResolveView decision={decision} onDone={close} />
        ) : (
          <CreateForm projects={projects} projectId={projectId} onCreated={close} />
        )}
      </SheetContent>
    </Sheet>
  );
}
