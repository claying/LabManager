import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { IDEA_STATES, IDEA_STATE_LABELS } from "@pi-os/types";
import type { IdeaWithRelations } from "@pi-os/types";
import { useIdeas, useArchiveIdea, useConvertIdeaToProject } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@pi-os/ui/components/sheet";
import { toast } from "@pi-os/ui/components/sonner";
import { TopBar } from "../components/app-shell/topbar";
import { useQuickActions } from "../lib/quick-actions-context";

const VISIBLE_STATES = IDEA_STATES.filter((s) => s !== "archived");

export default function IdeasPage() {
  const { data: ideas, isLoading } = useIdeas();
  const { openIdeaCapture } = useQuickActions();
  const [selected, setSelected] = useState<IdeaWithRelations | null>(null);

  const total = ideas?.filter((i) => i.state !== "archived").length ?? 0;

  return (
    <>
      <TopBar>
        <PageHeader title="Ideas" className="py-0" />
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {total} idea{total === 1 ? "" : "s"}
          </span>
          <Button size="sm" onClick={openIdeaCapture}>
            <Lightbulb className="h-3.5 w-3.5" /> Capture
          </Button>
        </div>

        {isLoading ? (
          <div className="max-w-2xl space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            title="No ideas yet"
            description="Press ⌘⇧I to capture one."
            className="mt-12"
          />
        ) : (
          <div className="max-w-2xl space-y-6">
            {VISIBLE_STATES.map((state) => {
              const group = (ideas ?? []).filter((i) => i.state === state);
              if (group.length === 0) return null;
              return (
                <section key={state}>
                  <div className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
                    {IDEA_STATE_LABELS[state]}
                  </div>
                  <div className="divide-border border-border divide-y border-y">
                    {group.map((idea) => (
                      <button
                        key={idea.id}
                        onClick={() => setSelected(idea)}
                        className="hover:bg-muted/40 flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                      >
                        <span className="text-foreground truncate">{idea.title}</span>
                        {idea.relatedProject && (
                          <span className="text-muted-foreground shrink-0 truncate text-xs">
                            {idea.relatedProject.title}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <IdeaDetailPanel idea={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}

function IdeaDetailPanel({
  idea,
  onOpenChange,
}: {
  idea: IdeaWithRelations | null;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const archiveIdea = useArchiveIdea();
  const convertIdea = useConvertIdeaToProject();

  if (!idea) return null;

  async function onArchive() {
    try {
      await archiveIdea.mutateAsync(idea!.id);
      toast("Idea archived", {
        action: { label: "Undo", onClick: () => archiveIdea.mutate(idea!.id) },
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't archive idea", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function onConvert() {
    try {
      const project = await convertIdea.mutateAsync({ idea: idea! });
      toast.success("Converted to project");
      onOpenChange(false);
      navigate(`/projects/${project.id}`);
    } catch (error) {
      toast.error("Couldn't convert idea", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Sheet open={Boolean(idea)} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{idea.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4">
          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {idea.relatedProject && (
            <p className="text-muted-foreground text-sm">Related: {idea.relatedProject.title}</p>
          )}
          {idea.state === "converted" && idea.convertedProject && (
            <p className="text-sm">
              Converted to{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => navigate(`/projects/${idea.convertedProject!.id}`)}
              >
                {idea.convertedProject.title}
              </button>
            </p>
          )}
        </div>
        {idea.state !== "converted" && idea.state !== "archived" && (
          <SheetFooter>
            <Button variant="outline" onClick={onArchive} disabled={archiveIdea.isPending}>
              Archive
            </Button>
            <Button onClick={onConvert} disabled={convertIdea.isPending}>
              {convertIdea.isPending ? "Converting…" : "Convert to Project"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
