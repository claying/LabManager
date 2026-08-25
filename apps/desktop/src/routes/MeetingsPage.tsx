import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Video } from "lucide-react";
import { MEETING_TYPE_LABELS } from "@pi-os/types";
import { useMeetings, usePeople, useProjects } from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { PersonAvatar } from "@pi-os/ui/components/domain/person-avatar";
import { useActiveWorkspace } from "../lib/workspace-context";
import { TopBar } from "../components/app-shell/topbar";
import { MeetingFormDialog } from "../components/meetings/meeting-form-dialog";

export default function MeetingsPage() {
  const [searchParams] = useSearchParams();
  const { currentPerson } = useActiveWorkspace();

  const { data: meetings, isLoading } = useMeetings();
  const { data: people = [] } = usePeople();
  const { data: projects = [] } = useProjects();

  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "meeting");
  const highlighted = searchParams.get("open");
  const sorted = useMemo(() => meetings ?? [], [meetings]);

  return (
    <>
      <TopBar>
        <PageHeader title="Meetings" className="py-0" />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Meeting
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No meetings logged"
            description="Record progress, results, blockers, decisions, and next actions from your lab's meetings."
            action={<Button onClick={() => setCreateOpen(true)}>New Meeting</Button>}
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((m) => (
              <Card key={m.id} className={m.id === highlighted ? "border-primary/50" : undefined}>
                <CardContent className="space-y-2.5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-foreground text-sm font-medium">{m.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(m.meeting_date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {m.project ? ` · ${m.project.title}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{MEETING_TYPE_LABELS[m.meeting_type]}</Badge>
                  </div>
                  {m.attendees.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {m.attendees.map((a) => (
                        <div
                          key={a.id}
                          className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        >
                          <PersonAvatar name={a.name} size="sm" className="h-4 w-4" />
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.decisions && (
                    <div className="border-primary/30 bg-primary/[0.04] rounded-md border p-2.5">
                      <p className="text-primary text-[11px] font-semibold uppercase tracking-wide">
                        Decisions
                      </p>
                      <p className="text-foreground text-sm">{m.decisions}</p>
                    </div>
                  )}
                  {m.next_steps && (
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-medium">Next: </span>
                      {m.next_steps}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MeetingFormDialog
        createdBy={currentPerson?.id ?? null}
        projects={projects}
        people={people}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
