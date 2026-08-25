import { useState } from "react";
import { History } from "lucide-react";
import { useMemory, useProjects, usePeople } from "@pi-os/repositories";
import { MEMORY_EVENT_TYPES, MEMORY_EVENT_TYPE_LABELS } from "@pi-os/types";
import type { MemoryEvent, MemoryEventType } from "@pi-os/types";
import { Button } from "@pi-os/ui/components/button";
import { Input } from "@pi-os/ui/components/input";
import { Badge } from "@pi-os/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pi-os/ui/components/select";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { TopBar } from "../components/app-shell/topbar";
import { MemoryContextPanel } from "../components/memory/memory-context-panel";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MemoryPage() {
  const [typeFilter, setTypeFilter] = useState<MemoryEventType | "all">("all");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [personId, setPersonId] = useState<string | undefined>();
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [selected, setSelected] = useState<{ type: MemoryEventType; id: string } | null>(null);

  const { data: projects } = useProjects(true);
  const { data: people } = usePeople();
  const { data: events, isLoading } = useMemory({
    types: typeFilter === "all" ? undefined : [typeFilter],
    projectId,
    personId,
    after: after || undefined,
    before: before || undefined,
    limit: 200,
  });

  const quickTypes: (MemoryEventType | "all")[] = [
    "all",
    "decision",
    "meeting",
    "update",
    "evidence",
  ];

  return (
    <>
      <TopBar>
        <PageHeader
          title="Research Memory"
          description="Chronological history of everything recorded."
        />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-2">
          {quickTypes.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "All" : MEMORY_EVENT_TYPE_LABELS[t]}
            </Button>
          ))}
          <Select
            value={typeFilter === "all" || quickTypes.includes(typeFilter) ? "__more" : typeFilter}
            onValueChange={(v) => setTypeFilter(v as MemoryEventType)}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="More types…" />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_EVENT_TYPES.filter((t) => !quickTypes.includes(t)).map((t) => (
                <SelectItem key={t} value={t}>
                  {MEMORY_EVENT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={projectId ?? "all"}
            onValueChange={(v) => setProjectId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={personId ?? "all"}
            onValueChange={(v) => setPersonId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              {people?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            className="h-8 w-36"
            aria-label="After"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            className="h-8 w-36"
            aria-label="Before"
          />
          {(projectId || personId || after || before || typeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProjectId(undefined);
                setPersonId(undefined);
                setAfter("");
                setBefore("");
                setTypeFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {!isLoading && (!events || events.length === 0) && (
          <EmptyState
            icon={History}
            title="Nothing recorded yet"
            description="Decisions, meetings, updates, and other research activity will show up here as they happen."
          />
        )}

        <div className="divide-border divide-y">
          {events?.map((e) => (
            <MemoryRow
              key={`${e.type}-${e.id}`}
              event={e}
              onClick={() => setSelected({ type: e.type, id: e.id })}
            />
          ))}
        </div>
      </main>

      <MemoryContextPanel selected={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}

function MemoryRow({ event, onClick }: { event: MemoryEvent; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex w-full items-start gap-4 py-3 text-left transition-colors"
    >
      <span className="text-muted-foreground w-14 shrink-0 pt-0.5 text-xs">
        {formatShortDate(event.date)}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <Badge variant="outline">{MEMORY_EVENT_TYPE_LABELS[event.type]}</Badge>
        <p className="text-foreground truncate text-sm">{event.title}</p>
        {(event.project_title || event.person_name) && (
          <p className="text-muted-foreground truncate text-xs">
            {[event.project_title, event.person_name].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}
