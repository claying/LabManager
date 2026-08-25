import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { usePersonProfile, useDecisionRequests } from "@pi-os/repositories";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";

/**
 * Surfaces what still depends on a person once they become alumni, so
 * nothing quietly goes unfinished when they leave (Tier 3 section 11).
 * The checklist is entirely computed from existing data — never a
 * separate stored checklist that could drift out of date.
 */
export function AlumniContinuityCard({ personId }: { personId: string }) {
  const { data: profile } = usePersonProfile(personId);
  const { data: openDecisions = [] } = useDecisionRequests({ status: "open", personId });

  if (!profile) return null;

  const activeLedProjects = profile.ledProjects.filter((p) => !p.archived);
  const openActions = profile.actionItems.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  );
  const unfinishedPapers = profile.publications.filter(
    (p) => p.status !== "published" && p.status !== "withdrawn",
  );

  const checklist = [
    {
      label: "Repository documented",
      done: activeLedProjects.every((p) => Boolean(p.git_repository_path)),
    },
    { label: "Actions reassigned", done: openActions.length === 0 },
    { label: "Paper status updated", done: unfinishedPapers.length === 0 },
    { label: "Decisions resolved", done: openDecisions.length === 0 },
  ];

  const hasContinuityConcerns =
    activeLedProjects.length > 0 ||
    openActions.length > 0 ||
    unfinishedPapers.length > 0 ||
    openDecisions.length > 0;

  if (!hasContinuityConcerns) {
    return (
      <Card className="border-success/40 bg-success/[0.04]">
        <CardContent className="py-4 text-sm">
          <p className="text-foreground font-medium">No open continuity items</p>
          <p className="text-muted-foreground text-xs">
            No active led projects, open actions, unfinished papers, or unresolved decisions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/40 bg-warning/[0.04]">
      <CardContent className="space-y-4 py-4">
        <div>
          <h3 className="text-foreground text-sm font-semibold">Continuity checklist</h3>
          <p className="text-muted-foreground text-xs">
            Now that they're alumni — what still needs attention.
          </p>
        </div>

        {activeLedProjects.length > 0 && (
          <Section title={`Projects still depending on them (${activeLedProjects.length})`}>
            {activeLedProjects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block text-sm hover:underline">
                {p.title}
              </Link>
            ))}
          </Section>
        )}

        {openActions.length > 0 && (
          <Section title={`Open actions (${openActions.length})`}>
            {openActions.map((a) => (
              <p key={a.id} className="text-sm">
                {a.title}
              </p>
            ))}
          </Section>
        )}

        {unfinishedPapers.length > 0 && (
          <Section title={`Unfinished papers (${unfinishedPapers.length})`}>
            {unfinishedPapers.map((p) => (
              <Link
                key={p.id}
                to={`/publications/${p.id}`}
                className="block text-sm hover:underline"
              >
                {p.title}
              </Link>
            ))}
          </Section>
        )}

        {openDecisions.length > 0 && (
          <Section title={`Unresolved decisions (${openDecisions.length})`}>
            {openDecisions.map((d) => (
              <p key={d.id} className="text-sm">
                {d.title}
              </p>
            ))}
          </Section>
        )}

        <div className="space-y-1 border-t pt-3">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="text-success h-3.5 w-3.5 shrink-0" />
              ) : (
                <Circle className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              )}
              <span className={item.done ? "text-muted-foreground" : "text-foreground"}>
                {item.label}
              </span>
              {!item.done && <Badge variant="outline">check</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
