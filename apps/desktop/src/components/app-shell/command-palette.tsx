import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarPlus,
  CircleHelp,
  FileText,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  PiggyBank,
  PlusCircle,
  Scale,
  UsersRound,
  Users,
  Video,
} from "lucide-react";
import { useGlobalSearch, type SearchResultKind } from "@pi-os/repositories";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@pi-os/ui/components/command";
import { useQuickActions } from "../../lib/quick-actions-context";

const KIND_ICON: Record<SearchResultKind, typeof FlaskConical> = {
  project: FlaskConical,
  person: Users,
  project_update: MessageSquare,
  meeting: Video,
  publication: FileText,
  grant: PiggyBank,
  decision_request: Scale,
  idea: Lightbulb,
  research_question: CircleHelp,
  hypothesis: FlaskConical,
};
const KIND_HREF: Record<SearchResultKind, (id: string, extra?: string) => string> = {
  project: (id) => `/projects/${id}`,
  person: (id) => `/people/${id}`,
  project_update: (_id, projectId) => `/projects/${projectId}`,
  meeting: () => `/meetings`,
  publication: (id) => `/publications/${id}`,
  grant: () => `/grants`,
  decision_request: () => `/inbox`,
  idea: () => `/ideas`,
  research_question: () => `/projects`,
  hypothesis: () => `/projects`,
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { openIdeaCapture, openNewDecision, openNewVenueCycle } = useQuickActions();
  const [query, setQuery] = useState("");
  const { data: results } = useGlobalSearch(query);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    navigate(href);
  }

  function run(action: () => void) {
    onOpenChange(false);
    setQuery("");
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or jump to…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/projects?new=project")}>
            <PlusCircle className="h-4 w-4" /> New Project
          </CommandItem>
          <CommandItem onSelect={() => run(openIdeaCapture)}>
            <Lightbulb className="h-4 w-4" /> New Idea
            <span className="text-muted-foreground ml-auto text-xs">⌘⇧I</span>
          </CommandItem>
          <CommandItem onSelect={() => run(openNewDecision)}>
            <Scale className="h-4 w-4" /> New Decision
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <PlusCircle className="h-4 w-4" /> New Update
          </CommandItem>
          <CommandItem onSelect={() => go("/meetings?new=meeting")}>
            <PlusCircle className="h-4 w-4" /> New Meeting
          </CommandItem>
          <CommandItem onSelect={() => run(openNewVenueCycle)}>
            <CalendarPlus className="h-4 w-4" /> New Venue Cycle
          </CommandItem>
          <CommandItem onSelect={() => go("/portfolio")}>
            <BarChart3 className="h-4 w-4" /> Open Portfolio
          </CommandItem>
          <CommandItem onSelect={() => go("/supervision")}>
            <UsersRound className="h-4 w-4" /> Open Supervision
          </CommandItem>
        </CommandGroup>
        {results && results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Results">
              {results.map((r) => {
                const Icon = KIND_ICON[r.kind];
                return (
                  <CommandItem
                    key={`${r.kind}-${r.id}`}
                    onSelect={() => go(KIND_HREF[r.kind](r.id))}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="text-muted-foreground ml-auto truncate text-xs">
                        {r.subtitle}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
        {!query && (
          <>
            <CommandSeparator />
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-2 py-2 text-xs">
              <span>⌘K search</span>
              <span>⌘⇧I capture idea</span>
              <span>J/K navigate inbox</span>
              <span>Esc close</span>
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
