"use client";

import { useRef, useState } from "react";
import type { Person } from "@pi-os/types";
import {
  useOneOnOnePrep,
  useCreateMeeting,
  useCreateActionItem,
  useCreateDecisionRequest,
  useResolveDecisionRequest,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Textarea } from "@pi-os/ui/components/textarea";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@pi-os/ui/components/dialog";
import { toast } from "@pi-os/ui/components/sonner";
import { Plus, Square, X } from "lucide-react";
import { useActiveWorkspace } from "../../lib/workspace-context";

interface ActionRow {
  assignee: "them" | "me";
  text: string;
}

const CHIPS = ["Blocker", "Idea", "Decision", "Follow-up"] as const;

export function OneOnOneDialog({
  open,
  onOpenChange,
  person,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
}) {
  const { currentPerson } = useActiveWorkspace();
  const { data: prep, isLoading } = useOneOnOnePrep(open ? person.id : undefined);
  const createMeeting = useCreateMeeting(currentPerson?.id ?? null);
  const createAction = useCreateActionItem();
  const createDecision = useCreateDecisionRequest();
  const resolveDecision = useResolveDecisionRequest();

  const [stage, setStage] = useState<"prep" | "notes">("prep");
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState<string[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setStage("prep");
    setNotes("");
    setDecisions([]);
    setActions([]);
  }

  function insertChip(chip: string) {
    setNotes((n) => (n ? `${n}\n${chip}: ` : `${chip}: `));
    notesRef.current?.focus();
  }

  async function finish() {
    const cleanDecisions = decisions.map((d) => d.trim()).filter(Boolean);
    const cleanActions = actions.filter((a) => a.text.trim());

    try {
      await createMeeting.mutateAsync({
        title: `1:1 — ${person.name}`,
        meeting_type: "one_on_one",
        meeting_date: new Date().toISOString(),
        project_id: null,
        attendee_person_ids: currentPerson ? [person.id, currentPerson.id] : [person.id],
        progress: null,
        results: notes.trim() || null,
        blockers: null,
        decisions: cleanDecisions.length > 0 ? cleanDecisions.join("\n") : null,
        next_steps: null,
      });

      for (const text of cleanDecisions) {
        const request = await createDecision.mutateAsync({
          title: text,
          person_id: person.id,
          priority: "normal",
          options: [],
          context: null,
          recommendation: null,
        });
        await resolveDecision.mutateAsync({ id: request.id, decision: text, rationale: null });
      }

      for (const action of cleanActions) {
        await createAction.mutateAsync({
          input: {
            title: action.text.trim(),
            description: null,
            status: "open",
            priority: "medium",
            due_date: null,
            assignee_person_id:
              action.assignee === "them" ? person.id : (currentPerson?.id ?? null),
            project_id: null,
          },
        });
      }

      toast.success("Saved", {
        description:
          [
            cleanActions.length &&
              `${cleanActions.length} action${cleanActions.length === 1 ? "" : "s"}`,
            cleanDecisions.length &&
              `${cleanDecisions.length} decision${cleanDecisions.length === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save 1:1", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const saving = createMeeting.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-xl flex-col">
        <DialogHeader>
          <DialogTitle>{person.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : stage === "prep" ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <PrepSection title="Since last 1:1">
              {prep?.sinceLastOneOnOne.map((p) => (
                <Row key={p.projectTitle} label={p.projectTitle} value={p.detail} />
              ))}
            </PrepSection>
            <PrepSection title="Open actions">
              {prep?.openActions.map((a) => (
                <Row key={a.id} label={a.title} />
              ))}
            </PrepSection>
            <PrepSection title="Upcoming">
              {prep?.upcoming.map((u, i) => (
                <Row key={i} label={u.title} value={u.detail} />
              ))}
            </PrepSection>
            <PrepSection title="Last decisions">
              {prep?.lastDecisions.map((d, i) => (
                <Row key={i} label={d} />
              ))}
            </PrepSection>
            <Button className="mt-2 self-start" onClick={() => setStage("notes")}>
              Start 1:1
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Notes
                </p>
                <div className="flex gap-1">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => insertChip(chip)}
                      className="border-border text-muted-foreground hover:text-foreground rounded-full border px-2 py-0.5 text-xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                ref={notesRef}
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Decisions
              </p>
              {decisions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={d}
                    onChange={(e) =>
                      setDecisions((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                    placeholder="Use 5 seeds"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setDecisions((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDecisions((prev) => [...prev, ""])}
              >
                <Plus className="h-3.5 w-3.5" /> Add decision
              </Button>
            </div>

            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Actions
              </p>
              {actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Square className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <button
                    onClick={() =>
                      setActions((prev) =>
                        prev.map((x, idx) =>
                          idx === i ? { ...x, assignee: x.assignee === "them" ? "me" : "them" } : x,
                        ),
                      )
                    }
                    className="text-muted-foreground hover:text-foreground w-14 shrink-0 text-left text-xs"
                  >
                    {a.assignee === "them" ? person.name.split(" ")[0] : "Me"}
                  </button>
                  <Input
                    value={a.text}
                    onChange={(e) =>
                      setActions((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)),
                      )
                    }
                    placeholder="Rerun ablation"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActions((prev) => [...prev, { assignee: "them", text: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add action
              </Button>
            </div>

            <Button className="mt-auto self-end" onClick={finish} disabled={saving}>
              {saving ? "Saving…" : "Finish 1:1"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrepSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode[] | undefined;
}) {
  if (!children || children.filter(Boolean).length === 0) return null;
  return (
    <section className="space-y-1">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground truncate">{label}</span>
      {value && <span className="text-muted-foreground shrink-0 text-xs">{value}</span>}
    </div>
  );
}
