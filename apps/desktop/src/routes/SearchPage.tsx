import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAdvancedSearch } from "@pi-os/repositories";
import {
  parseSearchQuery,
  KIND_LABELS,
  type SearchResult,
  type SearchResultKind,
} from "@pi-os/repositories";
import { Input } from "@pi-os/ui/components/input";
import { Badge } from "@pi-os/ui/components/badge";
import { EmptyState } from "@pi-os/ui/components/domain/empty-state";
import { PageHeader } from "@pi-os/ui/components/domain/page-header";
import { TopBar } from "../components/app-shell/topbar";

const EXAMPLE_TOKENS = [
  "project:",
  "person:",
  "type:decision",
  "type:meeting",
  "type:file",
  "after:2026-01-01",
  "before:2026-12-31",
  "status:",
  "venue:",
];

const KIND_ROUTE: Record<SearchResultKind, (id: string) => string> = {
  project: (id) => `/projects/${id}`,
  person: (id) => `/people/${id}`,
  project_update: () => `/projects`,
  meeting: () => `/meetings`,
  publication: (id) => `/publications/${id}`,
  grant: () => `/grants`,
  decision_request: () => `/inbox`,
  idea: () => `/ideas`,
  research_question: () => `/projects`,
  hypothesis: () => `/projects`,
  file: () => `/projects`,
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { freeText, filters } = useMemo(() => parseSearchQuery(query), [query]);
  const { data: results, isLoading } = useAdvancedSearch(query);

  function removeFilter(key: string) {
    const re = new RegExp(`\\b${key}:("[^"]*"|\\S+)\\s*`, "i");
    setQuery((q) => q.replace(re, "").trim());
  }

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>();
    for (const r of results ?? []) {
      const arr = map.get(r.kind) ?? [];
      arr.push(r);
      map.set(r.kind, arr);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <>
      <TopBar>
        <PageHeader
          title="Advanced Search"
          description="project:X person:Y type:decision after:2026-07-01 status:blocked venue:ICLR"
        />
      </TopBar>
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="space-y-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: type:decision project:GraphFM after:2026-07-01"
              className="pl-9"
              list="search-tokens"
              autoFocus
            />
            <datalist id="search-tokens">
              {EXAMPLE_TOKENS.map((t) => (
                <option key={t} value={query ? `${query} ${t}` : t} />
              ))}
            </datalist>
          </div>
          {Object.keys(filters).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(filters).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-1">
                  {key}:{value}
                  <button onClick={() => removeFilter(key)} aria-label={`Remove ${key} filter`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {freeText && <Badge variant="outline">text: {freeText}</Badge>}
            </div>
          )}
        </div>

        {query.trim().length < 2 ? (
          <EmptyState
            icon={Search}
            title="Search across everything"
            description="Combine free text with structured filters like project:, person:, type:, after:, before:, status:, and venue:."
          />
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">Searching…</p>
        ) : grouped.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try removing a filter or broadening the text."
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(([kind, items]) => (
              <div key={kind} className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {KIND_LABELS[kind]} ({items.length})
                </p>
                <div className="divide-border divide-y">
                  {items.map((r) => (
                    <Link
                      key={`${r.kind}-${r.id}`}
                      to={KIND_ROUTE[r.kind](r.id)}
                      className="hover:bg-accent flex items-center justify-between gap-2 px-1 py-2 text-sm"
                    >
                      <span className="text-foreground truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="text-muted-foreground shrink-0 truncate text-xs">
                          {r.subtitle}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
