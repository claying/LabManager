import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Inbox as InboxIcon, MoreHorizontal, Scale } from "lucide-react";
import { INBOX_GROUP_LABELS, INBOX_GROUPS } from "@pi-os/types";
import type { InboxItem, InboxGroup, DecisionRequestWithRelations } from "@pi-os/types";
import {
  useInbox,
  useSnoozeInboxItem,
  useDismissInboxItem,
  useRestoreInboxItem,
  useDecisionRequests,
  useProjects,
} from "@pi-os/repositories";
import { Button } from "@pi-os/ui/components/button";
import { Skeleton } from "@pi-os/ui/components/skeleton";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pi-os/ui/components/dropdown-menu";
import { toast } from "@pi-os/ui/components/sonner";
import { TopBar } from "../components/app-shell/topbar";
import { DecisionRequestPanel } from "../components/decisions/decision-request-panel";

const GROUP_ICON: Record<InboxGroup, typeof Scale> = {
  decide: Scale,
  blocked: AlertTriangle,
  stale: Clock,
  due_soon: Clock,
  follow_up: InboxIcon,
};

export default function InboxPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useInbox();
  const { data: openDecisions = [] } = useDecisionRequests({ status: "open" });
  const { data: projects = [] } = useProjects();
  const snooze = useSnoozeInboxItem();
  const dismiss = useDismissInboxItem();
  const restore = useRestoreInboxItem();

  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [decisionPanel, setDecisionPanel] = useState<DecisionRequestWithRelations | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const grouped = useMemo(() => {
    const map = new Map<InboxGroup, InboxItem[]>();
    for (const group of INBOX_GROUPS) map.set(group, []);
    for (const item of items ?? []) map.get(item.group)?.push(item);
    return map;
  }, [items]);

  const flat = useMemo(() => items ?? [], [items]);

  useEffect(() => {
    if (!focusedKey && flat.length > 0) setFocusedKey(flat[0]!.key);
  }, [flat, focusedKey]);

  function openItem(item: InboxItem) {
    if (item.entityType === "decision") {
      const decision = openDecisions.find((d) => d.id === item.entityId);
      if (decision) setDecisionPanel(decision);
      return;
    }
    navigate(item.href);
  }

  async function handleSnooze(item: InboxItem) {
    await snooze.mutateAsync(item.key);
    toast("Snoozed 3 days", { action: { label: "Undo", onClick: () => restore.mutate(item.key) } });
  }

  async function handleDismiss(item: InboxItem) {
    await dismiss.mutateAsync(item.key);
    toast("Dismissed", { action: { label: "Undo", onClick: () => restore.mutate(item.key) } });
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
        return;
      const idx = flat.findIndex((i) => i.key === focusedKey);
      if (e.key === "j") {
        e.preventDefault();
        const next = flat[Math.min(idx + 1, flat.length - 1)];
        if (next) setFocusedKey(next.key);
      } else if (e.key === "k") {
        e.preventDefault();
        const prev = flat[Math.max(idx - 1, 0)];
        if (prev) setFocusedKey(prev.key);
      } else if (e.key === "Enter") {
        const item = flat[idx];
        if (item) openItem(item);
      } else if (e.key.toLowerCase() === "e") {
        const item = flat[idx];
        if (item) {
          if (item.entityType === "decision") openItem(item);
          else handleDismiss(item);
        }
      } else if (e.key.toLowerCase() === "s") {
        const item = flat[idx];
        if (item) handleSnooze(item);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat, focusedKey, openDecisions]);

  useEffect(() => {
    if (focusedKey) rowRefs.current.get(focusedKey)?.scrollIntoView({ block: "nearest" });
  }, [focusedKey]);

  const total = flat.length;

  return (
    <>
      <TopBar>
        <PageHeader title="Inbox" className="py-0" />
      </TopBar>
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            title="Inbox clear"
            description="Nothing needs your input."
            className="mt-12"
          />
        ) : (
          <div className="max-w-2xl space-y-6">
            {INBOX_GROUPS.map((group) => {
              const groupItems = grouped.get(group) ?? [];
              if (groupItems.length === 0) return null;
              const Icon = GROUP_ICON[group];
              return (
                <section key={group}>
                  <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                    <Icon className="h-3.5 w-3.5" />
                    {INBOX_GROUP_LABELS[group]}
                  </div>
                  <div className="divide-border border-border divide-y border-y">
                    {groupItems.map((item) => {
                      const focused = item.key === focusedKey;
                      return (
                        <div
                          key={item.key}
                          ref={(el) => {
                            if (el) rowRefs.current.set(item.key, el);
                          }}
                          onClick={() => {
                            setFocusedKey(item.key);
                            openItem(item);
                          }}
                          onMouseEnter={() => setFocusedKey(item.key)}
                          className={`group flex cursor-pointer items-center justify-between gap-3 px-2 py-2 text-sm ${
                            focused ? "bg-muted/60" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {item.severity === "critical" && (
                              <span className="bg-destructive h-1.5 w-1.5 shrink-0 rounded-full" />
                            )}
                            <span className="text-foreground shrink-0 font-medium">
                              {item.title}
                            </span>
                            <span className="text-muted-foreground truncate">{item.context}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSnooze(item);
                              }}
                            >
                              Snooze
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => handleDismiss(item)}>
                                  Dismiss
                                </DropdownMenuItem>
                                {item.entityType === "project" && (
                                  <DropdownMenuItem onClick={() => navigate(item.href)}>
                                    Open project
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <DecisionRequestPanel
        open={Boolean(decisionPanel)}
        onOpenChange={(open) => !open && setDecisionPanel(null)}
        decision={decisionPanel ?? undefined}
        projects={projects}
      />
    </>
  );
}
