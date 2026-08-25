import { GitBranch, GitCommit } from "lucide-react";
import { useGitInfo } from "@pi-os/repositories";
import { Card, CardContent } from "@pi-os/ui/components/card";
import { Badge } from "@pi-os/ui/components/badge";

/** Lightweight, local-only git status for a project's linked repository (SPEC_followup.md section 17). */
export function GitInfoCard({ path }: { path: string | null | undefined }) {
  const { data: info, isLoading } = useGitInfo(path);
  if (!path || (!isLoading && !info)) return null;

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <h3 className="text-foreground text-sm font-semibold">Git repository</h3>
        {isLoading || !info ? (
          <p className="text-muted-foreground text-sm">Reading repository…</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{info.branch}</span>
              {info.has_uncommitted_changes && <Badge variant="warning">Uncommitted changes</Badge>}
            </div>
            <div className="flex items-start gap-2">
              <GitCommit className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground truncate">{info.last_commit_message}</p>
                <p className="text-muted-foreground text-xs">
                  {info.last_commit_sha.slice(0, 7)} ·{" "}
                  {new Date(info.last_commit_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
