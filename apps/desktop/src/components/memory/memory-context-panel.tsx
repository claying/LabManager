import { useMemoryContext } from "@pi-os/repositories";
import { MEMORY_EVENT_TYPE_LABELS } from "@pi-os/types";
import type { MemoryEvent, MemoryEventType } from "@pi-os/types";
import { Badge } from "@pi-os/ui/components/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@pi-os/ui/components/sheet";

function Row({ event, tone }: { event: MemoryEvent; tone: "before" | "current" | "after" }) {
  return (
    <div
      className={
        tone === "current"
          ? "border-primary bg-primary/5 rounded-md border p-3"
          : "border-border rounded-md border p-3 opacity-80"
      }
    >
      <div className="flex items-center gap-2">
        <Badge variant={tone === "current" ? "default" : "outline"}>
          {MEMORY_EVENT_TYPE_LABELS[event.type]}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
      <p className="text-foreground mt-1.5 text-sm">{event.title}</p>
      {event.summary && <p className="text-muted-foreground mt-0.5 text-xs">{event.summary}</p>}
      {event.project_title && (
        <p className="text-muted-foreground mt-1 text-xs">{event.project_title}</p>
      )}
    </div>
  );
}

export function MemoryContextPanel({
  selected,
  onOpenChange,
}: {
  selected: { type: MemoryEventType; id: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: context, isLoading } = useMemoryContext(selected?.type, selected?.id);

  return (
    <Sheet open={Boolean(selected)} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Context</SheetTitle>
        </SheetHeader>
        {isLoading || !context?.current ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            {context.before.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Before
                </p>
                {context.before.map((e) => (
                  <Row key={`${e.type}-${e.id}`} event={e} tone="before" />
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Current
              </p>
              <Row event={context.current} tone="current" />
            </div>
            {context.after.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  After
                </p>
                {context.after.map((e) => (
                  <Row key={`${e.type}-${e.id}`} event={e} tone="after" />
                ))}
              </div>
            )}
            {context.before.length === 0 && context.after.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No other recorded activity {context.current.project_title ? "on this project" : ""}{" "}
                nearby in time.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
