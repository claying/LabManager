import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RelatedEntityRef, RelatedSummary as RelatedSummaryData } from "@pi-os/types";

const ENTITY_ROUTE: Record<RelatedEntityRef["kind"], (id: string) => string> = {
  project: (id) => `/projects/${id}`,
  person: (id) => `/people/${id}`,
  publication: (id) => `/publications/${id}`,
  decision: () => `/inbox`,
  meeting: () => `/meetings`,
  grant: () => `/grants`,
  idea: () => `/ideas`,
  research_question: () => `/projects`,
  hypothesis: () => `/projects`,
  evidence: () => `/projects`,
};

const GROUPS: { key: keyof RelatedSummaryData; label: string; singular: string }[] = [
  { key: "projects", label: "projects", singular: "project" },
  { key: "decisions", label: "decisions", singular: "decision" },
  { key: "papers", label: "papers", singular: "paper" },
  { key: "meetings", label: "meetings", singular: "meeting" },
  { key: "grants", label: "grants", singular: "grant" },
  { key: "ideas", label: "ideas", singular: "idea" },
  { key: "questions", label: "questions", singular: "question" },
  { key: "evidence", label: "evidence", singular: "evidence" },
];

/** A compact, reusable "2 projects · 3 decisions · 1 paper · 4 meetings" line that expands into the actual linked entities (Tier 3 section 2). */
export function RelatedSummary({ data }: { data: RelatedSummaryData | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const nonEmpty = GROUPS.filter((g) => data[g.key].length > 0);
  if (nonEmpty.length === 0) {
    return <p className="text-muted-foreground text-xs">Nothing linked yet.</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-medium">Related</span>
        <span>
          {nonEmpty
            .map((g) => `${data[g.key].length} ${data[g.key].length === 1 ? g.singular : g.label}`)
            .join(" · ")}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 pl-4">
          {nonEmpty.map((g) => (
            <div key={g.key} className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                {g.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data[g.key].map((ref) => (
                  <Link
                    key={ref.id}
                    to={ENTITY_ROUTE[ref.kind](ref.id)}
                    className="border-border hover:border-foreground/30 rounded-full border px-2 py-0.5 text-xs"
                  >
                    {ref.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
