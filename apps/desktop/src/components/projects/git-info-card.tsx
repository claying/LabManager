import { GitBranch, Tag } from "lucide-react";
import { useGitInfo } from "@pi-os/repositories";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Lightweight, local-only git status for a project's linked repository (SPEC_followup.md section 17, Tier 3 section 5). */
export function GitInfoCard({ path }: { path: string | null | undefined }) {
  const { data: info, isLoading } = useGitInfo(path);
  if (!path || (!isLoading && !info)) return null;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <h3 className="text-foreground text-sm font-semibold">Code</h3>
        {isLoading || !info ? (
          <p className="text-muted-foreground text-sm">Reading repository…</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{info.branch}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {info.changed_file_count === 0
                  ? "clean"
                  : `${info.changed_file_count} changed file${info.changed_file_count === 1 ? "" : "s"}`}
              </span>
              {info.has_uncommitted_changes && <Badge variant="warning">Dirty</Badge>}
            </div>

            {info.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="text-muted-foreground h-3 w-3" />
                {info.tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-mono text-[10px]">
                    {tag}
                  </Badge>
                ))}
                {info.tags.length > 6 && (
                  <span className="text-muted-foreground text-xs">+{info.tags.length - 6}</span>
                )}
              </div>
            )}

            {info.recent_commits.length > 0 && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Recent
                </p>
                <ul className="space-y-1">
                  {info.recent_commits.map((c) => (
                    <li key={c.sha} className="flex items-start gap-2">
                      <span className="text-muted-foreground w-14 shrink-0 text-xs">
                        {timeAgo(c.committed_at)}
                      </span>
                      <span className="text-foreground min-w-0 truncate">{c.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p
              className="text-muted-foreground truncate font-mono text-xs"
              title={info.repository_root}
            >
              {info.repository_root}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
